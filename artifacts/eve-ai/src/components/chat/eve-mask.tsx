import { motion } from "framer-motion";

interface EveMaskProps {
  isThinking?: boolean;
  isSpeaking?: boolean;
  className?: string;
}

export function EveMask({ isThinking = false, isSpeaking = false, className = "" }: EveMaskProps) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Glow effect behind the mask */}
      <motion.div
        className="absolute inset-0 rounded-full bg-primary/20 blur-xl"
        animate={{
          scale: isThinking ? [1, 1.2, 1] : isSpeaking ? [1, 1.1, 1.3, 1.1, 1] : 1,
          opacity: isThinking ? [0.3, 0.6, 0.3] : isSpeaking ? [0.4, 0.8, 0.4] : 0.1,
        }}
        transition={{
          duration: isThinking ? 2 : isSpeaking ? 0.5 : 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* The Mask */}
      <motion.div
        className="relative z-10 overflow-hidden rounded-full border border-primary/20 bg-background/50 shadow-2xl backdrop-blur-sm"
        animate={{
          y: isThinking ? [0, -5, 0] : isSpeaking ? [0, -2, 2, -2, 0] : [0, -2, 0],
        }}
        transition={{
          duration: isThinking ? 3 : isSpeaking ? 0.5 : 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <img 
          src="/logo.png" 
          alt="EVE Punu Mask" 
          className="h-full w-full object-cover mix-blend-screen"
        />
      </motion.div>
    </div>
  );
}
