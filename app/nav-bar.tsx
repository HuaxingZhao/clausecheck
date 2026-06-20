"use client";

import { useState, useEffect } from "react";
import { isPro } from "@/lib/quota";

export default function NavBar() {
  const [pro, setPro] = useState(false);

  useEffect(() => {
    setPro(isPro());
  }, []);

  return (
    <nav className="border-b border-border bg-paper/80 backdrop-blur sticky top-0 z-40">
      <div className="nav-inner">
        <a href="#" className="font-sans font-semibold text-lg tracking-tight">
          ClauseCheck
          {pro && (
            <span className="ml-2.5 inline-flex items-center gap-1 text-xs bg-accent/15 text-[#8B3A0E] px-2 py-0.5 rounded-full font-sans font-semibold align-middle">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              专业版
            </span>
          )}
        </a>
        <div className="flex items-center gap-6 text-sm font-sans text-ink-light">
          <a href="#how" className="hover:text-ink transition-colors">
            怎么用
          </a>
          <a href="#pricing" className="hover:text-ink transition-colors">
            定价
          </a>
          <a href="#faq" className="hover:text-ink transition-colors">
            FAQ
          </a>
          <a href="#upload" className="btn btn-primary text-xs">
            开始扫描
          </a>
        </div>
      </div>
    </nav>
  );
}
