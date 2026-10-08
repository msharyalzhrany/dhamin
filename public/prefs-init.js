// نضبط اللغة والثيم قبل رسم الصفحة لتفادي الوميض
      try {
        var p = JSON.parse(localStorage.getItem('dhamin-prefs') || '{}');
        var lang = p.lang === 'en' ? 'en' : 'ar';
        var d = document.documentElement;
        d.lang = lang; d.dir = lang === 'ar' ? 'rtl' : 'ltr';
        var dark = p.theme === 'dark' || ((!p.theme || p.theme === 'system') && matchMedia('(prefers-color-scheme: dark)').matches);
        if (dark) d.classList.add('dark');
        var steps = [0.875, 1, 1.125, 1.25, 1.4];
        d.style.fontSize = (16 * steps[typeof p.font === 'number' ? p.font : 1]) + 'px';
      } catch (e) {}
