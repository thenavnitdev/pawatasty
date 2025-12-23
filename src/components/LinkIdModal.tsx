import { Copy, Check, Camera, QrCode as QrCodeIcon } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useToast } from '../utils/toastContext';
import { connectionInvitesAPI } from '../services/mobile/connectionInvites';
import jsQR from 'jsqr';

interface LinkIdModalProps {
  onClose: () => void;
  userLinkId?: string;
}

type TabType = 'details' | 'scanner';

export default function LinkIdModal({ onClose, userLinkId }: LinkIdModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [inputLinkId, setInputLinkId] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { showToast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanDebug, setScanDebug] = useState('');
  const scanIntervalRef = useRef<number | null>(null);

  const handleCopyLinkId = async () => {
    if (!userLinkId) return;

    try {
      await navigator.clipboard.writeText(userLinkId);
      setCopied(true);
      showToast('Link ID copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showToast('Failed to copy Link ID', 'error');
    }
  };

  const handleSendInvite = async (linkIdToSend?: string) => {
    const linkId = linkIdToSend || inputLinkId.trim();

    if (!linkId) {
      setError('Please enter a Link ID');
      return;
    }

    if (linkId.length !== 6) {
      setError('Link ID must be exactly 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      console.log('Sending invite to Link ID:', linkId);
      const result = await connectionInvitesAPI.sendInvite(linkId);
      console.log('Invite result:', result);

      if (!result.success) {
        const errorMsg = result.error || 'Failed to send invite';
        console.error('Invite failed:', errorMsg);
        setError(errorMsg);
        showToast(errorMsg, 'error');
      } else {
        console.log('Invite sent successfully!');
        setSuccess(true);
        showToast('Connection invite sent successfully!', 'success');
        setInputLinkId('');

        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      console.error('Send invite error:', err);
      const errorMsg = err?.message || 'Failed to send invite. Please try again.';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length <= 6) {
      setInputLinkId(value);
      setError('');
      setSuccess(false);
    }
  };

  const scanQRCode = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    try {
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });

      if (code && code.data) {
        const scannedData = code.data.trim().toUpperCase();
        console.log('QR Code detected:', scannedData);
        setScanDebug(`Found: ${scannedData}`);

        const linkIdMatch = scannedData.match(/[A-Z0-9]{6}/);
        if (linkIdMatch) {
          const linkId = linkIdMatch[0];
          console.log('Valid Link ID found:', linkId);
          setScanDebug(`Processing: ${linkId}`);
          setScanning(false);
          stopScanning();
          stopCamera();
          await handleSendInvite(linkId);
        } else {
          console.log('QR code data does not match Link ID format:', scannedData);
          setScanDebug(`Invalid format: ${scannedData.substring(0, 20)}`);
          setTimeout(() => setScanDebug(''), 2000);
        }
      } else {
        setScanDebug('');
      }
    } catch (err) {
      console.error('Error scanning QR code:', err);
      setScanDebug('Scan error');
    }
  };

  const startScanning = () => {
    setScanning(true);
    scanIntervalRef.current = window.setInterval(() => {
      scanQRCode();
    }, 200);
  };

  const stopScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    if (activeTab === 'scanner') {
      setScanDebug('');
      startCamera();
    } else {
      stopCamera();
      stopScanning();
      setScanDebug('');
    }

    return () => {
      stopCamera();
      stopScanning();
    };
  }, [activeTab]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          focusMode: 'continuous' as any,
          advanced: [{ focusMode: 'continuous' }] as any
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraActive(true);
          console.log('Camera started, beginning QR scan...');
          startScanning();
        };
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      showToast("Could not access camera. Please check permissions.", 'error');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-50 flex items-end justify-center animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-w-md max-h-[90vh] overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white px-6 py-4 flex items-center justify-center rounded-t-3xl border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Link to connect</h2>
        </div>

        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-3 px-4 font-semibold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'details'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-400'
            }`}
          >
            <QrCodeIcon className="w-5 h-5" />
            Details
          </button>
          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex-1 py-3 px-4 font-semibold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'scanner'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-400'
            }`}
          >
            <Camera className="w-5 h-5" />
            QR Scanner
          </button>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {activeTab === 'details' ? (
            <div className="px-6 py-6 space-y-6">
              {userLinkId && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Your Link ID</h3>
                      <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                        <span className="text-lg font-bold text-gray-900 tracking-wider flex-1">{userLinkId}</span>
                        <button
                          onClick={handleCopyLinkId}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                        >
                          {copied ? (
                            <Check className="w-5 h-5 text-green-600" />
                          ) : (
                            <Copy className="w-5 h-5 text-gray-600" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Share this code/scan QR to invite and connect with friends.
                      </p>
                    </div>

                    <div className="flex-shrink-0">
                      <div className="bg-white p-3 rounded-xl border-2 border-gray-200 shadow-sm">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${userLinkId}&bgcolor=FFFFFF&color=000000`}
                          alt={`QR Code for ${userLinkId}`}
                          className="w-36 h-36"
                          onError={(e) => {
                            console.error('QR code failed to load');
                            e.currentTarget.src = `https://quickchart.io/qr?text=${userLinkId}&size=400`;
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Connect with a friend
                  </label>
                  <input
                    type="text"
                    value={inputLinkId}
                    onChange={handleInputChange}
                    placeholder="ABC3454"
                    maxLength={6}
                    className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-center text-lg font-semibold tracking-wider uppercase placeholder:text-gray-300"
                  />
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    Enter 6 characters (letters and numbers)
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                    <p className="text-sm text-green-700 font-medium">Connection invite sent successfully!</p>
                  </div>
                )}

                <button
                  onClick={() => handleSendInvite()}
                  disabled={loading || inputLinkId.length !== 6 || success}
                  className="w-full bg-black text-white py-4 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending invite...' : success ? 'Invite sent!' : 'Add friend'}
                </button>
              </div>
            </div>
          ) : (
            <div className="relative bg-black" style={{ height: '500px' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute top-0 left-0 w-full h-full object-cover"
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              <div className="relative z-10 flex flex-col items-center justify-center h-full px-8 text-white">
                <div
                  className="w-64 h-64 bg-transparent relative rounded-3xl"
                  style={{ boxShadow: '0 0 0 4000px rgba(0,0,0,0.6)' }}
                >
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-white rounded-tl-3xl"></div>
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-white rounded-tr-3xl"></div>
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-white rounded-bl-3xl"></div>
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-white rounded-br-3xl"></div>
                </div>
                <p className="text-lg font-semibold mt-8 text-center" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>
                  Point the camera at the QR code
                </p>
                <p className="text-sm text-gray-300 mt-2 text-center" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>
                  {scanDebug || (scanning ? 'Scanning...' : 'Connection invite will be sent automatically')}
                </p>
              </div>

              {!cameraActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <div className="text-center text-white">
                    <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Starting camera...</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(-100%); }
          50% { transform: translateY(100%); }
        }
      `}</style>
    </div>
  );
}
