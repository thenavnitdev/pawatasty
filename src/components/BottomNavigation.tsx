interface BottomNavigationProps {
  onDiscoverClick: () => void;
  onMapClick?: () => void;
  onBookingsClick: () => void;
  activeView?: 'discover' | 'map' | 'bookings';
  unreadInvitesCount?: number;
}

export default function BottomNavigation({
  onDiscoverClick,
  onMapClick,
  onBookingsClick,
  activeView = 'map',
  unreadInvitesCount = 0
}: BottomNavigationProps) {
  return (
    <div className="absolute bottom-5 left-0 right-0 px-4 z-30">
      <div className="bg-white rounded-full shadow-2xl px-5 py-2.5 flex justify-between items-center max-w-md mx-auto">
        <button
          onClick={onDiscoverClick}
          className="p-3 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Discover"
        >
          <svg width="29" height="29" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
              fill={activeView === 'discover' ? '#1E293B' : '#64748B'}
              d="M12 13q-.425 0-.713-.288T11 12q0-.425.288-.713T12 11q.425 0 .713.288T13 12q0 .425-.288.713T12 13Zm0 9q-2.075 0-3.9-.788t-3.175-2.137q-1.35-1.35-2.137-3.175T2 12q0-2.075.788-3.9t2.137-3.175q1.35-1.35 3.175-2.137T12 2q2.075 0 3.9.788t3.175 2.137q1.35 1.35 2.138 3.175T22 12q0 2.075-.788 3.9t-2.137 3.175q-1.35 1.35-3.175 2.138T12 22Zm0-2q3.35 0 5.675-2.325T20 12q0-3.35-2.325-5.675T12 4Q8.65 4 6.325 6.325T4 12q0 3.35 2.325 5.675T12 20Zm0-8Zm-4.575 5.075l6.25-2.925q.15-.075.275-.2t.2-.275l2.925-6.25q.125-.25-.063-.438t-.437-.062l-6.25 2.925q-.15.075-.275.2t-.2.275l-2.925 6.25q-.125.25.063.438t.437.062Z"
            />
          </svg>
        </button>

        <button
          onClick={onMapClick}
          className="p-3 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Map"
        >
          <svg width="29" height="29" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="m3 6l6-3l6 3l6-3v15l-6 3l-6-3l-6 3zm6-3v15m6-12v15"
              stroke={activeView === 'map' ? '#1E293B' : '#64748B'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <button
          onClick={onBookingsClick}
          className="p-3 hover:bg-gray-100 rounded-full transition-colors relative"
          aria-label="Bookings"
        >
          <svg width="23" height="25" viewBox="0 0 23 25" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M1.29886 1.95375C1.15163 1.78184 1.05677 1.57133 1.02552 1.34716C0.994275 1.12299 1.02795 0.894566 1.12256 0.68895C1.21716 0.483334 1.36873 0.30915 1.5593 0.187043C1.74988 0.0649357 1.97146 2.36632e-05 2.1978 0H16.8222C17.5148 -1.03206e-08 18.2006 0.136418 18.8405 0.401465C19.4804 0.666511 20.0618 1.055 20.5515 1.54474C21.0413 2.03448 21.4298 2.61589 21.6948 3.25577C21.9599 3.89565 22.0963 4.58147 22.0963 5.27407C22.0963 5.96667 21.9599 6.65249 21.6948 7.29237C21.4298 7.93225 21.0413 8.51366 20.5515 9.0034C20.0618 9.49314 19.4804 9.88163 18.8405 10.1467C18.2006 10.4117 17.5148 10.5481 16.8222 10.5481H2.1978C1.97146 10.5481 1.74988 10.4832 1.5593 10.3611C1.36873 10.239 1.21716 10.0648 1.12256 9.85919C1.02795 9.65357 0.994275 9.42514 1.02552 9.20097C1.05677 8.9768 1.15163 8.76629 1.29886 8.59439L2.18256 7.56302C2.72886 6.92574 3.02915 6.11404 3.02915 5.27466C3.02915 4.43527 2.72886 3.62357 2.18256 2.9863L1.29886 1.95375ZM4.58871 2.34403C5.10258 3.23503 5.37309 4.24551 5.37309 5.27407C5.37309 6.30263 5.10258 7.31311 4.58871 8.20411H16.8222C17.5993 8.20411 18.3446 7.89541 18.8941 7.34592C19.4435 6.79643 19.7522 6.05116 19.7522 5.27407C19.7522 4.49697 19.4435 3.75171 18.8941 3.20222C18.3446 2.65273 17.5993 2.34403 16.8222 2.34403H4.58871ZM1 16.9942C1 15.5955 1.55566 14.254 2.54474 13.2649C3.53382 12.2758 4.8753 11.7202 6.27407 11.7202H20.8985C21.1248 11.7202 21.3464 11.7851 21.537 11.9072C21.7275 12.0293 21.8791 12.2035 21.9737 12.4091C22.0683 12.6147 22.102 12.8432 22.0708 13.0673C22.0395 13.2915 21.9446 13.502 21.7974 13.6739L20.9125 14.7053C20.3662 15.3426 20.0659 16.1543 20.0659 16.9936C20.0659 17.833 20.3662 18.6447 20.9125 19.282L21.7974 20.3134C21.945 20.4853 22.0402 20.6959 22.0716 20.9202C22.1031 21.1446 22.0695 21.3733 21.9748 21.5791C21.8802 21.7849 21.7285 21.9593 21.5377 22.0814C21.3469 22.2036 21.125 22.2685 20.8985 22.2683H6.27407C4.8753 22.2683 3.53382 21.7126 2.54474 20.7236C1.55566 19.7345 1 18.393 1 16.9942ZM6.27407 14.0642C5.49697 14.0642 4.75171 14.3729 4.20222 14.9224C3.65273 15.4719 3.34403 16.2171 3.34403 16.9942C3.34403 17.7713 3.65273 18.5166 4.20222 19.0661C4.75171 19.6156 5.49697 19.9243 6.27407 19.9243H18.5076C17.9937 19.0333 17.7232 18.0228 17.7232 16.9942C17.7232 15.9657 17.9937 14.9552 18.5076 14.0642H6.27407Z"
              fill={activeView === 'bookings' ? '#1E293B' : '#64748B'}
            />
          </svg>
          {unreadInvitesCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
              {unreadInvitesCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
