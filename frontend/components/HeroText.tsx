"use client";

import { motion } from "framer-motion";
import { fadeIn, slideUp, staggerChildren } from "@/lib/animations";

export default function HeroText() {
  return (
    <motion.div
      className="flex w-full max-w-[560px] flex-col justify-center gap-6 lg:w-1/2"
      initial="hidden"
      animate="visible"
      variants={staggerChildren}
    >
      <motion.div variants={fadeIn} className="inline-flex rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.32em] text-sky-200 shadow-sm shadow-sky-500/10">
        Trusted by 500+ Global Partners
      </motion.div>

      <motion.div variants={slideUp} className="space-y-3 text-white">
        <h1 className="text-5xl font-black leading-[0.92] tracking-[-0.04em] text-white sm:text-[5rem] md:text-[5.5rem] lg:text-[6rem]">
          The Global Standard
          <span className="block text-slate-300">for</span>
          <span className="block text-sky-300">Prize-Verified</span>
          <span className="block">Hackathons</span>
        </h1>
      </motion.div>

      <motion.p variants={fadeIn} className="max-w-[520px] text-base leading-8 text-slate-300 sm:text-lg">
        Host secure, high-stakes developer competitions with the industry’s most robust verification protocol. HackVillage ensures every prize reaches the right hands with clear auditability, automated escrow, and real-time trust signals.
      </motion.p>
    </motion.div>
  );
}
