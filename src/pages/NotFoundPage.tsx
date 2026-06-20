import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/liquid-glass-button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center pt-[72px] px-4 md:px-8">
      <div className="text-center max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="text-gray-100 font-display text-[clamp(5rem,20vw,12.5rem)] leading-none tracking-[-0.05em]">404</p>
          <h1 className="font-display text-black relative z-10 -mt-8 md:-mt-12 text-3xl md:text-5xl lg:text-6xl leading-tight">Page Not Found</h1>
          <p className="text-gray-600 text-sm md:text-base mt-5 max-w-md mx-auto leading-relaxed">The page you're looking for doesn't exist or has been moved.</p>
          <Button asChild variant="cool" className="mt-8 w-full md:w-auto px-8 py-4 h-auto text-xs md:text-sm uppercase tracking-[0.1em] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
            <Link to="/">
              <ArrowLeft size={16} />
              Back to Home
            </Link>
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
