import './Loading.css';

const Loading = () => {
  return (
    <div className="sk-app">
      <div className="sk-header">
        <div className="sk-header__left">
          <div className="sk sk-logo" />

        </div>
        <div className="sk-header__right">
          <div className="sk sk-btn-sq" />
          <div className="sk sk-btn-sq" />
          <div className="sk sk-avatar" />
        </div>
      </div>

      <div className="sk-stats">
        {[0, 1, 2, 3].map(i => (
          <div className="sk-stat-item" key={i}>
            <div className="sk sk-stat-num" style={{ animationDelay: `${i * 0.07}s` }} />
            <div className="sk sk-stat-lbl" style={{ animationDelay: `${i * 0.07 + 0.05}s` }} />
          </div>
        ))}
      </div>

      <div className="sk-progress">
        <div className="sk sk-prog-label" />
        <div className="sk sk-prog-track" />
        <div className="sk sk-prog-pct" />
      </div>

      <div className="sk-filters">
        {[80, 100, 90, 110, 95, 85].map((w, i) => (
          <div className="sk sk-filter-pill" key={i} style={{ width: w, animationDelay: `${i * 0.04}s` }} />
        ))}
        <div className="sk sk-filters__label" />

      </div>

      <div className="sk-main">
        <div className="sk-sidebar">
          <div className="sk sk-sidebar__title" />
          <div className="sk-sidebar__stats">
            {[0, 1, 2].map(i => (
              <div className="sk sk-sidebar__stat" key={i} style={{ animationDelay: `${i * 0.07}s` }} />
            ))}
          </div>
          <div className="sk sk-sidebar__card" />
          <div className="sk-sidebar__list">
            {[0, 1, 2, 3].map(i => (
              <div className="sk sk-sidebar__row" key={i} style={{ animationDelay: `${i * 0.06}s` }} />
            ))}
          </div>
        </div>

        <div className="sk-content">
          {[0, 1].map(year => (
            <div className="sk-year-block" key={year}>
              <div className="sk-year-block__header">
                <div className="sk sk-year-label" style={{ animationDelay: `${year * 0.1}s` }} />
                <div className="sk sk-year-badge" style={{ animationDelay: `${year * 0.1 + 0.05}s` }} />
              </div>
              <div className="sk-year-cols">
                {[0, 1].map(col => (
                  <div className="sk-col" key={col}>
                    <div className="sk sk-col-title" style={{ animationDelay: `${(year * 2 + col) * 0.05}s` }} />
                    {Array.from({ length: col === 0 ? 3 : 2 }).map((_, c) => (
                      <div className="sk-subject-card" key={c} style={{ animationDelay: `${(year * 2 + col) * 0.06 + c * 0.04}s` }}>
                        <div className="sk sk-subject-card__name" />
                        <div className="sk sk-subject-card__code" />
                        <div className="sk sk-subject-card__badge" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Loading;