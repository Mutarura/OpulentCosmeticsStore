import React from 'react';

export const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-rose-50 to-slate-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto space-y-16">
          <section className="space-y-6">
            <p className="text-sm font-semibold tracking-[0.28em] uppercase text-gray-600">
              ABOUT OPULENT COSMETICS
            </p>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-slate-900 leading-tight">
              Thoughtful beauty, curated for real routines — not just for the shelf.
            </h1>
            <p className="text-base md:text-lg text-gray-700 max-w-3xl">
              Opulent Cosmetics is a modern beauty destination for men and women who want products
              that feel good, work hard, and fit into everyday life. We focus on formulas, finishes,
              and textures that deliver comfort, performance, and a little bit of quiet luxury.
            </p>
          </section>

          <section className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h2 className="text-sm font-semibold tracking-[0.24em] uppercase text-gray-700 mb-3">
                FOR HER
              </h2>
              <p className="text-sm md:text-base text-gray-700">
                From skin-prep to statement scents, we curate pieces that layer seamlessly into a
                busy woman&apos;s routine — from desk, to dinner, to downtime.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h2 className="text-sm font-semibold tracking-[0.24em] uppercase text-gray-700 mb-3">
                FOR HIM
              </h2>
              <p className="text-sm md:text-base text-gray-700">
                Elevated grooming and fragrance essentials with clean lines, refined notes, and
                low-fuss routines that still feel considered.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h2 className="text-sm font-semibold tracking-[0.24em] uppercase text-gray-700 mb-3">
                FOR REAL LIFE
              </h2>
              <p className="text-sm md:text-base text-gray-700">
                We think about shelf-life, storage, and wear — so what you buy feels as good on the
                50th use as it did on the first.
              </p>
            </div>
          </section>

          <section className="grid lg:grid-cols-[1.4fr_1fr] gap-10 items-start">
            <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl">
              <h2 className="text-xl md:text-2xl font-serif font-bold text-slate-900 mb-4">
                How we curate
              </h2>
              <p className="text-sm md:text-base text-slate-700 mb-4">
                Every product on Opulent Cosmetics goes through a simple but strict lens: formula,
                finish, wear, and storage. We look at how it feels on the skin, how it behaves in
                Kenya&apos;s climate, and how it fits into a routine that needs to move.
              </p>
              <p className="text-sm md:text-base text-slate-700 mb-4">
                We prioritise:
              </p>
              <ul className="space-y-2 text-sm md:text-base text-slate-700 list-disc list-inside">
                <li>Comfortable textures that don&apos;t feel heavy, sticky, or drying</li>
                <li>Fragrances that feel refined, not overwhelming</li>
                <li>Smart packaging that travels and stores well</li>
                <li>Reliable restocking and proper storage on our side</li>
              </ul>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-md text-sm md:text-base text-gray-700">
                <p className="mb-3 font-medium text-slate-900">
                  Beauty should feel like a daily ritual — not a performance.
                </p>
                <p>
                  Whether it&apos;s a weekday moisturiser, a weekend scent, or a gift, we&apos;re
                  building a space where everything feels intentional, well kept, and genuinely
                  enjoyable to use.
                </p>
              </div>
            </div>
          </section>

          <section className="grid lg:grid-cols-[1.2fr_1fr] gap-10 items-start">
            <div className="space-y-4">
              <h2 className="text-xl md:text-2xl font-serif font-bold text-slate-900">
                Visit us at Two Rivers Mall
              </h2>
              <p className="text-sm md:text-base text-gray-700 max-w-xl">
                Prefer to see, swatch, or smell in person? You can visit us at our space in Two Rivers Mall
                for curated recommendations, gifting help, and a closer look at our core range.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-700">
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900">Location</p>
                  <p>Two Rivers Mall, Nairobi</p>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900">Hours</p>
                  <p>Daily: 10:00am – 7:00pm</p>
                  <p>Including weekends &amp; public holidays</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl overflow-hidden shadow-xl border border-slate-100">
              <div className="aspect-video">
                <iframe
                  title="Opulent Cosmetics - Two Rivers Mall"
                  src="https://www.google.com/maps?q=Two+Rivers+Mall+Nairobi&output=embed"
                  className="w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
