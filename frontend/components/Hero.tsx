"use client";

import { motion } from "framer-motion";
import HeroText from "@/components/HeroText";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Particles from "@/components/Particles";
import ThreeSphere from "@/components/ThreeSphere";
import { heroContainer } from "@/lib/animations";

export default function Hero() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <motion.div
        className=""
        initial="hidden"
        animate="visible"
        variants={heroContainer}
      >
        <Navbar />

        <section className="relative grid min-h-[calc(100vh-80px)] overflow-hidden bg-[#020713] hero-grid hero-spotlight px-6 pb-12 pt-8 sm:px-10 lg:px-12 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-stretch lg:gap-10">
          <Particles />
          <Sidebar />
          <div className="relative mx-auto flex w-full max-w-[1440px] flex-col gap-10 lg:col-span-1 lg:flex-row lg:items-center lg:justify-between">
            <HeroText />
            <div className="relative flex w-full flex-1 items-center justify-center lg:w-1/2">
              <div className="relative h-[420px] w-full max-w-[760px] sm:h-[520px]">
                <ThreeSphere />
              </div>
            </div>
          </div>
        </section>
      </motion.div>
    </div>
  );
}
