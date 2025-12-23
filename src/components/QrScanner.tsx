import React, { useState, useEffect, useRef, ChangeEvent, KeyboardEvent } from 'react';
import { Flashlight, Type, QrCode, AlertCircle, X } from 'lucide-react';
import { useToast } from '../utils/toastContext';
import { validateStationCode } from '../services/rentalValidation';
import { supabase } from '../lib/supabase';
import jsQR from 'jsqr';
import ChoosePaymentMethod from './ChoosePaymentMethod';

interface PowerbankUnavailableModalProps {
  onClose: () => void;
}

const PowerbankUnavailableModal: React.FC<PowerbankUnavailableModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">No Powerbanks Available</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-orange-500" />
          </div>
          <p className="text-gray-600 mb-2">
            All powerbanks at this station are currently in use.
          </p>
          <p className="text-sm text-gray-500">
            Please try another nearby station or check back later.
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-full bg-[#FF6B35] text-white py-3 rounded-xl font-semibold hover:bg-[#E55A2B] active:scale-95 transition-all"
        >
          Find Another Station
        </button>
      </div>
    </div>
  );
};

interface ActiveRentalModalProps {
  onClose: () => void;
}

const ActiveRentalModal: React.FC<ActiveRentalModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">Active Rental</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-blue-500" />
          </div>
          <p className="text-gray-600 mb-2">
            You already have an active powerbank rental.
          </p>
          <p className="text-sm text-gray-500">
            Please return your current powerbank before renting another one.
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-full bg-[#FF6B35] text-white py-3 rounded-xl font-semibold hover:bg-[#E55A2B] active:scale-95 transition-all"
        >
          Got It
        </button>
      </div>
    </div>
  );
};

interface PawaChargerProps {
  className?: string;
}

const PawaCharger: React.FC<PawaChargerProps> = ({ className = '' }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="30" y="20" width="40" height="60" rx="8" fill="#FF6B35" />
      <rect x="35" y="25" width="30" height="45" rx="4" fill="#FFA574" />
      <path d="M50 35 L45 50 L55 50 L50 65" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="45" y="10" width="10" height="12" rx="2" fill="#FF6B35" />
    </svg>
  );
};

interface ScanViewProps {
  onSwitchToManual: () => void;
}

const ScanView: React.FC<ScanViewProps> = ({ onSwitchToManual }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  useEffect(() => {
    const enableCamera = async () => {
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as any;

        if (capabilities && capabilities.torch) {
          setTorchSupported(true);
          console.log('Torch is supported on this device');
        } else {
          console.log('Torch is not supported on this device');
        }
      } catch (err) {
        console.error("Error accessing camera: ", err);
        alert("Could not access the camera. Please check your permissions.");
      }
    };

    enableCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
      }
    };
  }, []);

  const toggleTorch = async () => {
    if (!streamRef.current) return;

    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const capabilities = track.getCapabilities() as any;

      if (capabilities && capabilities.torch) {
        const newTorchState = !torchOn;

        await track.applyConstraints({
          advanced: [{ torch: newTorchState } as any]
        });

        setTorchOn(newTorchState);
        console.log(`Torch ${newTorchState ? 'enabled' : 'disabled'}`);
      } else {
        console.warn('Torch not supported');
        alert('Flashlight is not supported on this device');
      }
    } catch (err) {
      console.error('Error toggling torch:', err);
      alert('Failed to toggle flashlight. Your device may not support this feature.');
    }
  };

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover"
      />

      <div className="relative z-10 flex flex-col items-center justify-between h-full px-8 pt-8 text-white">
        <div className="w-full flex-grow flex flex-col items-center justify-center">
          <div
            className="w-64 h-64 bg-transparent relative rounded-3xl"
            style={{ boxShadow: '0 0 0 4000px rgba(0,0,0,0.6)' }}
          >
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-white rounded-tl-3xl"></div>
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-white rounded-tr-3xl"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-white rounded-bl-3xl"></div>
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-white rounded-br-3xl"></div>
          </div>
          <p className="text-xl font-semibold mt-6 text-center" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>
            Point the camera at the QR code
          </p>
        </div>

        <div className="absolute bottom-24 flex items-center space-x-8">
          <button onClick={onSwitchToManual} className="flex flex-col items-center space-y-2">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg transition-shadow hover:shadow-xl active:scale-95">
              <Type className="w-10 h-10 text-[#203F55]"/>
            </div>
          </button>
          <button
            onClick={toggleTorch}
            disabled={!torchSupported}
            className="flex flex-col items-center space-y-2 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Toggle flashlight"
          >
            <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all hover:shadow-xl active:scale-95 ${torchOn ? 'bg-yellow-300' : 'bg-white'}`}>
              <Flashlight className="w-10 h-10 text-[#203F55]" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

interface ManualViewProps {
  onSwitchToScan: () => void;
  onValidationComplete: (stationId: string, requiresPayment: boolean) => void;
  onShowUnavailable: () => void;
  onShowLimitExceeded: (stationId: string) => void;
  onShowActiveRental: () => void;
}

const ManualView: React.FC<ManualViewProps> = ({
  onSwitchToScan,
  onValidationComplete,
  onShowUnavailable,
  onShowLimitExceeded,
  onShowActiveRental
}) => {
  const [code, setCode] = useState<string[]>(new Array(6).fill(''));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    inputsRef.current[0]?.focus();

    const checkTorchSupport = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        streamRef.current = stream;

        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as any;

        if (capabilities && capabilities.torch) {
          setTorchSupported(true);
          console.log('Torch is supported in manual view');
        } else {
          console.log('Torch is not supported in manual view');
        }
      } catch (err) {
        console.error('Error checking torch support:', err);
      }
    };

    checkTorchSupport();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const validateCode = async (stationCode: string) => {
    if (isValidating) return;

    setIsValidating(true);
    console.log('🔍 Validating station code:', stationCode);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showToast('Please log in to continue', 'error');
        setIsValidating(false);
        return;
      }

      const result = await validateStationCode(stationCode, user.id);

      if (!result.isValid) {
        switch (result.error) {
          case 'STATION_NOT_FOUND':
            showToast('Invalid station code. Please try again.', 'error');
            setCode(new Array(6).fill(''));
            inputsRef.current[0]?.focus();
            break;
          case 'NO_POWERBANKS':
            onShowUnavailable();
            break;
          case 'ACTIVE_RENTAL':
            onShowActiveRental();
            break;
        }
      } else {
        if (result.error === 'DAILY_LIMIT_EXCEEDED') {
          onShowLimitExceeded(result.stationId!);
        } else {
          const requiresPayment = !result.hasActiveSubscription || result.dailyLimitUsed;
          onValidationComplete(result.stationId!, requiresPayment);
        }
      }
    } catch (error) {
      console.error('Validation error:', error);
      showToast('An error occurred. Please try again.', 'error');
    } finally {
      setIsValidating(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
    const { value } = e.target;
    if (/^[0-9]$/.test(value) || value === '') {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);

      if (value !== '' && index < 5) {
        inputsRef.current[index + 1]?.focus();
      } else if (value !== '' && index === 5) {
        const fullCode = newCode.join('');
        validateCode(fullCode);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && code[index] === '' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;

    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const capabilities = track.getCapabilities() as any;

      if (capabilities && capabilities.torch) {
        const newTorchState = !torchOn;

        await track.applyConstraints({
          advanced: [{ torch: newTorchState } as any]
        });

        setTorchOn(newTorchState);
        console.log(`Manual view torch ${newTorchState ? 'enabled' : 'disabled'}`);
      } else {
        console.warn('Torch not supported');
        alert('Flashlight is not supported on this device');
      }
    } catch (err) {
      console.error('Error toggling torch in manual view:', err);
      alert('Failed to toggle flashlight. Your device may not support this feature.');
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-between px-8 pt-20 text-gray-800">
      <div className="flex-grow flex flex-col items-center justify-center -mt-16 text-center">
        <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center shadow-lg overflow-hidden mb-6">
          <div className="scale-[0.7] -translate-y-2">
            <PawaCharger className="w-full h-full" />
          </div>
        </div>
        <p className="text-lg max-w-xs">
          Enter the 6 numbers below the <span className="text-orange-500 font-semibold">QR code</span>
        </p>

        <div className="flex justify-center items-center space-x-2 my-8">
          {code.map((digit, i) => (
            <React.Fragment key={i}>
              <input
                ref={el => { inputsRef.current[i] = el; }}
                type="tel"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleInputChange(e, i)}
                onKeyDown={e => handleKeyDown(e, i)}
                disabled={isValidating}
                className={`w-10 h-12 bg-transparent text-center text-3xl font-semibold border-b-2 outline-none transition-all ${
                  isValidating
                    ? 'border-orange-400 animate-pulse opacity-70'
                    : 'border-gray-300 focus:border-orange-500'
                }`}
              />
              {i === 2 && <div className="w-3 h-1 bg-gray-300 rounded-full" />}
            </React.Fragment>
          ))}
        </div>

        {isValidating && (
          <p className="text-sm text-orange-500 font-medium animate-pulse">
            Searching for station...
          </p>
        )}
      </div>

      <div className="absolute bottom-24 flex items-center space-x-8">
        <button onClick={onSwitchToScan} className="flex flex-col items-center space-y-2">
          <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center shadow-lg transition-all hover:shadow-xl active:scale-95">
            <QrCode className="w-10 h-10 text-white"/>
          </div>
        </button>
        <button
          onClick={toggleTorch}
          disabled={!torchSupported}
          className="flex flex-col items-center space-y-2 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Toggle flashlight"
        >
          <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all hover:shadow-xl active:scale-95 ${torchOn ? 'bg-yellow-300' : 'bg-gray-800'}`}>
            <Flashlight className={`w-10 h-10 ${torchOn ? 'text-gray-800' : 'text-white'}`} />
          </div>
        </button>
      </div>
    </div>
  );
};

interface QrScannerProps {
  onClose: () => void;
}

const QrScanner: React.FC<QrScannerProps> = ({ onClose }) => {
  const [view, setView] = useState<'scan' | 'manual'>('scan');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showUnavailableModal, setShowUnavailableModal] = useState(false);
  const [showActiveRentalModal, setShowActiveRentalModal] = useState(false);
  const [validatedStationId, setValidatedStationId] = useState<string>('');
  const { showToast } = useToast();

  const headerTitle = view === 'scan' ? '' : 'Manually';
  const headerColor = view === 'scan' ? 'text-white' : 'text-gray-800';

  const handleBackClick = () => {
    console.log('🔙 QrScanner back arrow clicked, calling onClose');
    onClose();
  };

  const handleValidationComplete = (stationId: string, needsPayment: boolean) => {
    console.log('✅ Validation complete:', stationId, 'Payment required:', needsPayment);
    setValidatedStationId(stationId);
    setShowPaymentModal(true);
  };

  const handleUnavailable = () => {
    setShowUnavailableModal(true);
  };

  const handleLimitExceeded = (stationId: string) => {
    console.log('Daily limit exceeded for station:', stationId);
    setValidatedStationId(stationId);
    setShowPaymentModal(true);
  };

  const handleActiveRental = () => {
    setShowActiveRentalModal(true);
  };

  const handlePaymentMethodSelected = async (paymentMethodId: string) => {
    console.log('💳 Payment method selected:', paymentMethodId, 'for station:', validatedStationId);
    showToast('Processing rental...', 'info');

    setShowPaymentModal(false);
    onClose();
  };

  const handlePaymentClose = () => {
    setShowPaymentModal(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col font-sans bg-white animate-fade-in">
      <header className={`absolute top-0 left-0 right-0 flex items-center p-4 z-50 pointer-events-auto ${headerColor}`} style={{ pointerEvents: 'auto' }}>
        <button onClick={handleBackClick} aria-label="Go back" className="active:scale-95 transition-transform p-2 -m-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <path d="m15 18-6-6 6-6"></path>
          </svg>
        </button>
        <h2 className="flex-1 text-center text-xl font-bold -ml-6">{headerTitle}</h2>
      </header>

      <main className="flex-1 flex flex-col">
        {view === 'scan' ?
          <ScanView
            onSwitchToManual={() => setView('manual')}
            onValidationComplete={handleValidationComplete}
            onShowUnavailable={handleUnavailable}
            onShowLimitExceeded={handleLimitExceeded}
            onShowActiveRental={handleActiveRental}
          /> :
          <ManualView
            onSwitchToScan={() => setView('scan')}
            onValidationComplete={handleValidationComplete}
            onShowUnavailable={handleUnavailable}
            onShowLimitExceeded={handleLimitExceeded}
            onShowActiveRental={handleActiveRental}
          />
        }
      </main>

      {showUnavailableModal && (
        <PowerbankUnavailableModal onClose={() => setShowUnavailableModal(false)} />
      )}

      {showActiveRentalModal && (
        <ActiveRentalModal onClose={() => setShowActiveRentalModal(false)} />
      )}

      {showPaymentModal && (
        <ChoosePaymentMethod
          onClose={handlePaymentClose}
          onPaymentMethodSelected={handlePaymentMethodSelected}
          title="Select Payment Method"
          description={`Complete your rental at station ${validatedStationId}`}
        />
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default QrScanner;
