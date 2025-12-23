import { useState, useEffect, memo } from 'react';
import { getProfileImageUrl } from '../utils/imageUtils';

interface CachedProfileImageProps {
  imagePath: string | null | undefined;
  userName: string;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

const CachedProfileImage = memo(({ imagePath, userName, className = '', size = 'medium' }: CachedProfileImageProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!imagePath) {
      setImageUrl(null);
      return;
    }

    // Generate URL only once when imagePath changes
    const url = getProfileImageUrl(imagePath);
    setImageUrl(url);
    setImageError(false);
  }, [imagePath]);

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'text-sm';
      case 'large':
        return 'text-3xl';
      default:
        return 'text-2xl';
    }
  };

  const initial = userName?.charAt(0).toUpperCase() || 'G';

  if (!imageUrl || imageError) {
    return (
      <span className={`text-white font-bold ${getSizeClasses()} ${className}`}>
        {initial}
      </span>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={userName}
      className={`w-full h-full object-cover ${className}`}
      loading="lazy"
      onError={() => setImageError(true)}
      crossOrigin="anonymous"
    />
  );
});

CachedProfileImage.displayName = 'CachedProfileImage';

export default CachedProfileImage;
