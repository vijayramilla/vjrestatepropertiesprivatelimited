import { motion } from 'framer-motion';

const GOOGLE_FORM_EMBED_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSevrQB3ecaxtYgFOcR6t77ozBjXpvbyAG90uvvH2s-MC_vWxA/viewform?embedded=true';

export default function SubmitRequirementPage() {
  return (
    <div className="min-h-screen bg-white pt-[72px]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-black px-4 py-10 md:px-8 md:py-14 lg:px-16"
      >
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          <p className="mb-3 text-xs uppercase tracking-[0.15em] text-gray-400 md:text-sm">
            Investment Requirements
          </p>
          <h1 className="font-display text-3xl leading-tight text-white md:text-5xl lg:text-6xl">
            Submit Your Requirement
          </h1>
          <p className="mt-4 max-w-xl text-sm text-gray-400 md:text-base">
            Tell us what you&apos;re looking for. Our team will review your preferences and reach out with
            matching properties in Bangalore.
          </p>
        </div>
      </motion.div>

      <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-8 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
        >
          <iframe
            src={GOOGLE_FORM_EMBED_URL}
            title="Submit Your Requirement — VJR Estate"
            width="100%"
            height={2067}
            frameBorder={0}
            marginHeight={0}
            marginWidth={0}
            className="block w-full min-h-[70vh] border-0 md:min-h-[2067px]"
            loading="lazy"
          >
            Loading…
          </iframe>
        </motion.div>
        <p className="mt-6 text-center text-xs text-gray-400">
          Form not loading?{' '}
          <a
            href={GOOGLE_FORM_EMBED_URL.replace('?embedded=true', '')}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 underline hover:text-black"
          >
            Open in a new tab
          </a>
        </p>
      </div>
    </div>
  );
}
