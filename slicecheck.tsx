const X = () => (    <div
      className="admin-theme min-h-[calc(100vh-var(--vjr-header-h))] bg-gradient-to-b from-[#F7F8FA] to-white"
      style={{ paddingTop: 'var(--vjr-header-h)' }}
    >
      <div className="mx-auto max-w-3xl px-3 py-4 pb-[calc(8rem+env(safe-area-inset-bottom))] sm:px-8 sm:py-6 sm:pb-32">
        {/* Compact premium page header — eyebrow, fixed title, right progress */}
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8a8778]">
              Partner listing · {partner.partnerType}
            </p>
            <h1 className="mt-1 text-[19px] font-semibold leading-tight tracking-tight text-[#0B1729] sm:text-[22px]">
              List Your Property
            </h1>
            <p className="mt-0.5 text-[12.5px] text-gray-500">Share your property details to get started.</p>
          </div>
          <span className="shrink-0 text-[11px] font-semibold tabular-nums tracking-[0.1em] text-[#C9A646]">
            STEP {String(step + 1).padStart(2, '0')} / {String(FORM_STEPS.length).padStart(2, '0')}
          </span>
        </div>

        {/* Compact stepper — thin rail, small dots, muted upcoming steps */}
        <nav aria-label="Listing steps" className="mt-5">
          <ol className="hidden items-center sm:flex">
            {FORM_STEPS.map((s, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <li key={s.label} className="flex min-w-0 flex-1 items-center">
                  <button
                    type="button"
                    onClick={() => goToStep(i)}
                    className={`group flex min-w-0 cursor-pointer flex-col items-start gap-1 rounded-lg py-1 pr-2 text-left transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A646] ${
                      active ? '' : 'opacity-70 hover:opacity-100'
                    }`}
                    aria-current={active ? 'step' : undefined}
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10.5px] font-bold ${
                        active
                          ? 'border-[#0B1729] bg-[#0B1729] text-white'
                          : done
                            ? 'border-[#C9A646]/50 bg-[#FBF7EC] text-[#8a6d1f]'
                            : 'border-gray-200 bg-white text-gray-400 group-hover:border-[#C9A646]/40'
                      }`}
                    >
                      {done ? '✓' : i + 1}
                    </span>
                    <span
                      className={`whitespace-nowrap text-[11px] font-semibold ${
                        active ? 'text-[#0B1729]' : done ? 'text-gray-500' : 'text-gray-400'
                      }`}
                    >
                      {s.short}
                    </span>
                    {active && <span className="h-0.5 w-5 rounded-full bg-[#C9A646]" aria-hidden="true" />}
                  </button>
                  {i < FORM_STEPS.length - 1 && (
                    <span className={`mx-1 h-px min-w-3 flex-1 ${done ? 'bg-[#C9A646]/45' : 'bg-gray-200'}`} aria-hidden="true" />
                  )}
                </li>
              );
            })

          </ol>
          {/* Mobile: numbered steps in a slim scrollable strip */}
          <div className="sm:hidden">
            <div className="-mx-3 overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <ol className="flex items-center gap-1.5 w-max">
                {FORM_STEPS.map((s, i) => {
                  const done = i < step;
                  const active = i === step;
                  return (
                    <li key={s.label} className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => goToStep(i)}
                        aria-current={active ? 'step' : undefined}
                        className={`flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] font-semibold transition-colors duration-200 ${
                          active
                            ? 'border-[#0B1729] bg-[#0B1729] text-white'
                            : done
                              ? 'border-[#C9A646]/50 bg-[#FBF7EC] text-[#8a6d1f]'
                              : 'border-gray-200 bg-white text-gray-400'
                        }`}
                      >
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9.5px] font-bold ${
                          active ? 'bg-[#C9A646] text-[#0B1729]' : done ? 'bg-[#C9A646]/25 text-[#8a6d1f]' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {done ? '✓' : i + 1}
                        </span>
                        {s.short}
                      </button>
                      {i < FORM_STEPS.length - 1 && <span className={`h-px w-2 ${done ? 'bg-[#C9A646]/45' : 'bg-gray-200'}`} aria-hidden="true" />}
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </nav>

        <form id="partner-property-form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="mt-6 space-y-4">
          <AnimatePresence mode="wait" initial={false}>
            {step === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: 28 * stepDir }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 * stepDir }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="space-y-4"
              >
                <div className="admin-section">
                  <h2 className="mb-5 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0A1628]">Basic Information</h2>);export default X;