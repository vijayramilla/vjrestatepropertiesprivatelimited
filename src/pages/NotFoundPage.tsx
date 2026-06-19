import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/liquid-glass-button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center pt-[72px]">
      <div className="text-center px-8">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="text-gray-100 font-display" style={{ fontSize: '200px', lineHeight: '1', letterSpacing: '-0.05em' }}>404</p>
          <h1 className="font-display text-black mt-[-80px] relative z-10" style={{ fontSize: '68px', lineHeight: '1.1' }}>Page Not Found</h1>
          <p className="text-gray-600 text-[18px] mt-[21px] max-w-[400px] mx-auto leading-relaxed">The page you're looking for doesn't exist or has been moved.</p>
          <Button asChild variant="cool" className="mt-[34px] px-8 py-4 h-auto text-[13px] uppercase tracking-[0.1em]">
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
