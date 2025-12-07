import { useEffect } from 'react';
import '../App.css';

function Toast({ toasts, removeToast }) {
  useEffect(() => {
    const timers = toasts.map(toast => {
      return setTimeout(() => {
        removeToast(toast.id);
      }, 5000); // Auto remove after 5 seconds
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [toasts, removeToast]);

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          onClick={() => removeToast(toast.id)}
        >
          <div className="toast-content">
            <span className="toast-message">{toast.message}</span>
            <button className="toast-close" onClick={() => removeToast(toast.id)}>
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Toast;