import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const API_KEY = Deno.env.get("API_KEY") || "b0834cfeae781e2c13213b55741d2717";
const API_SECRET = Deno.env.get("API_SECRET") || "db0572a02b9aa963b0138e7180ba994fa730ddf63cfc5b60798c15a234b6523f";
const API_BASE_URL = "https://api.pawatasty.com";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: "jpeg" | "png" | "webp";
}

function validateImageFormat(buffer: Uint8Array): boolean {
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return true;
  }
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 &&
    buffer[2] === 0x4E && buffer[3] === 0x47
  ) {
    return true;
  }
  return false;
}

function isHTMLResponse(buffer: Uint8Array): boolean {
  const text = new TextDecoder().decode(buffer.slice(0, 100));
  return text.toLowerCase().includes("<html") || text.toLowerCase().includes("<!doctype");
}

async function getImagePath(imageId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('files_storage')
      .select('path')
      .eq('id', parseInt(imageId, 10))
      .maybeSingle();

    if (error) {
      console.error('Error querying files_storage:', error);
      throw new Error(`Failed to find image: ${error.message}`);
    }

    if (!data || !data.path) {
      throw new Error(`Image not found in files_storage: ${imageId}`);
    }

    console.log(`Found image path for ID ${imageId}:`, data.path);
    return data.path;
  } catch (error) {
    console.error('getImagePath error:', error);
    throw error;
  }
}

async function fetchImageFromStorage(imagePath: string): Promise<Uint8Array> {
  // Remove leading slash if present
  const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;

  console.log(`Fetching image from Supabase Storage: ${cleanPath}`);

  try {
    // Try to fetch from Supabase Storage first
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('merchant-images')
      .download(cleanPath);

    if (storageData && !storageError) {
      console.log(`✅ Image found in Supabase Storage: ${cleanPath}`);
      const buffer = new Uint8Array(await storageData.arrayBuffer());

      if (!validateImageFormat(buffer)) {
        throw new Error("Invalid image format from storage");
      }

      return buffer;
    }

    console.warn(`Image not in storage, trying backend API: ${cleanPath}`);

    // Fallback to backend API if not in storage
    const endpoints = [
      `${API_BASE_URL}/${cleanPath}`,
      `${API_BASE_URL}/api/${cleanPath}`,
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying backend: ${endpoint}`);
        const response = await fetch(endpoint, {
          headers: {
            "X-API-Key": API_KEY,
            "X-API-Secret": API_SECRET,
          },
        });

        if (response.ok) {
          const buffer = new Uint8Array(await response.arrayBuffer());

          if (!isHTMLResponse(buffer) && validateImageFormat(buffer)) {
            console.log(`✅ Image found in backend API: ${endpoint}`);
            return buffer;
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch from ${endpoint}:`, err);
      }
    }

    throw new Error(`Image not found in storage or backend API: ${cleanPath}`);
  } catch (error) {
    console.error(`fetchImageFromStorage error:`, error);
    throw error;
  }
}

async function optimizeImage(
  buffer: Uint8Array,
  options: ImageOptions
): Promise<Uint8Array> {
  console.log("Image optimization requested:", options);
  console.log("Note: Returning original image. Server-side image optimization requires Sharp or ImageMagick.");

  return buffer;
}

function getPlaceholderImage(): Response {
  const placeholder = new Uint8Array([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
    0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
  ]);

  return new Response(placeholder, {
    headers: {
      ...corsHeaders,
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const imageId = pathParts[pathParts.length - 1];

    if (!imageId || imageId === "image-proxy") {
      return new Response(
        JSON.stringify({ error: "Image ID is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const options: ImageOptions = {
      width: url.searchParams.get("width") ? parseInt(url.searchParams.get("width")!) : 800,
      height: url.searchParams.get("height") ? parseInt(url.searchParams.get("height")!) : 600,
      quality: url.searchParams.get("quality") ? parseInt(url.searchParams.get("quality")!) : 85,
      format: (url.searchParams.get("format") as ImageOptions["format"]) || "jpeg",
    };

    console.log(`Processing image ID: ${imageId}`, options);

    const imagePath = await getImagePath(imageId);
    console.log(`Resolved path: ${imagePath}`);

    const imageBuffer = await fetchImageFromStorage(imagePath);

    const optimizedBuffer = await optimizeImage(imageBuffer, options);

    let contentType = "image/jpeg";
    if (optimizedBuffer[0] === 0x89 && optimizedBuffer[1] === 0x50) {
      contentType = "image/png";
    }

    return new Response(optimizedBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400, immutable",
        "X-Image-Id": imageId,
        "X-Content-Length": optimizedBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return getPlaceholderImage();
  }
});
