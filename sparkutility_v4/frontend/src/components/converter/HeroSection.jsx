import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, Infinity } from 'lucide-react';
export default function HeroSection() {
  return (
    <section className="relative py-16 sm:py-20 overflow-hidden">
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/5 blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      </div>
      <div className="relative max-w-4xl mx-auto text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-tight">
            Convert Any File.{' '}
            <span className="gradient-text">Locally.</span>
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Professional-grade file conversion powered by FFmpeg. No uploads, no file size limits,
            no cloud dependency. Your files never leave your machine. It just works, right in your browser.
          </p>
        </motion.div>
        {/* Feature pills — no tooltips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-3 mt-8"
        >
          {[
            { icon: Shield, label: '100% Private' },
            { icon: Infinity, label: 'No Size Limits' },
            { icon: Zap, label: 'Native Speed' },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm font-medium text-foreground/80"
            >
              <Icon className="w-4 h-4 text-primary" />
              {label}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
