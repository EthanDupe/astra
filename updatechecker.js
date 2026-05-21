<script>
  // --- 🚀 ASTRA AUTO-UPDATE CHECKER ---
  (() => {
    let lastVersion = null;

    async function checkForUpdates() {
      try {
        // Fetch only the headers (super lightweight) and bust the cache with a timestamp
        const response = await fetch(window.location.href.split('?')[0] + '?t=' + Date.now(), { 
          method: 'HEAD',
          cache: 'no-store'
        });

        // Check GitHub's Last-Modified or ETag header
        const currentVersion = response.headers.get('Last-Modified') || response.headers.get('ETag');

        if (!lastVersion) {
          // First check: just record the current version
          lastVersion = currentVersion;
          return;
        }

        if (currentVersion && currentVersion !== lastVersion) {
          // 🚨 A change was detected!
          showUpdateNotification();
          lastVersion = currentVersion; // Stop it from spamming the popup
        }
      } catch (error) {
        console.log("Update check paused (offline or network error).");
      }
    }

    function showUpdateNotification() {
      // Don't show if one is already on screen
      if (document.getElementById('astra-update-toast')) return;

      // Create the notification container
      const toast = document.createElement('div');
      toast.id = 'astra-update-toast';
      
      // 🎨 Styled to perfectly match your Dark Glass aesthetic!
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(20, 20, 30, 0.85);
        backdrop-filter: blur(20px) saturate(150%);
        -webkit-backdrop-filter: blur(20px) saturate(150%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 16px 40px -10px rgba(0, 0, 0, 0.7);
        color: #ffffff;
        padding: 12px 20px;
        border-radius: 50px;
        z-index: 100000;
        display: flex;
        align-items: center;
        gap: 15px;
        font-family: 'Roboto Flex', sans-serif;
        animation: slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      `;

      toast.innerHTML = `
        <span style="font-weight: 600; font-size: 0.95rem; letter-spacing: 0.5px;">✨ Update Available</span>
        <button id="toast-reload" style="background: rgba(165, 180, 252, 0.85); color: #050505; border: none; padding: 6px 16px; border-radius: 30px; font-weight: 700; font-family: inherit; cursor: none; transition: transform 0.2s;">Reload</button>
        <button id="toast-close" style="background: transparent; color: #9aa0b8; border: none; font-size: 1.5rem; cursor: none; padding: 0; line-height: 1; transition: color 0.2s;">&times;</button>
      `;

      document.body.appendChild(toast);

      // Inject the slide-down animation
      if (!document.getElementById('toast-keyframes')) {
        const style = document.createElement('style');
        style.id = 'toast-keyframes';
        style.innerHTML = `
          @keyframes slideDown {
            from { top: -50px; opacity: 0; transform: translateX(-50%) scale(0.9); }
            to { top: 20px; opacity: 1; transform: translateX(-50%) scale(1); }
          }
        `;
        document.head.appendChild(style);
      }

      // 🖱️ Button Click Logic
      const reloadBtn = document.getElementById('toast-reload');
      const closeBtn = document.getElementById('toast-close');

      reloadBtn.addEventListener('click', () => window.location.reload(true));
      
      closeBtn.addEventListener('click', () => {
        toast.style.animation = 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards';
        setTimeout(() => toast.remove(), 300);
      });

      // Bind your custom fluid cursor to the new buttons!
      [reloadBtn, closeBtn].forEach(btn => {
        btn.addEventListener('mouseenter', () => document.getElementById('cursor').classList.add('hover'));
        btn.addEventListener('mouseleave', () => document.getElementById('cursor').classList.remove('hover'));
      });
    }

    // Run the check immediately on load to get the baseline version
    checkForUpdates();
    
    // Set the interval to check every 25 seconds (25,000 milliseconds)
    setInterval(checkForUpdates, 25000);
  })();
</script>
