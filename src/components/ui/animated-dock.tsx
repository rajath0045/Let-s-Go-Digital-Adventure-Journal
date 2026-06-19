"use client" 

import * as React from "react"
import { useRef } from "react";
import {
  MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
 
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { Link, useLocation } from "react-router-dom";
 
const cn = (...args: any[]) => twMerge(clsx(args));
 
export interface AnimatedDockProps {
  className?: string;
  items: DockItemData[];
}
 
export interface DockItemData {
  link: string;
  Icon: React.ReactNode;
  target?: string;
}
 
export const AnimatedDock = ({ className, items }: AnimatedDockProps) => {
  const mouseX = useMotionValue(Infinity);
  const location = useLocation();
 
  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "mx-auto flex w-fit h-16 items-end gap-4 rounded-2xl bg-white/80 border border-parchment-200 shadow-xl px-4 pb-3 backdrop-blur-md",
        className,
      )}
    >
      {items.map((item, index) => {
        const isActive = location.pathname === item.link;
        const isExternal = item.link.startsWith("http://") || item.link.startsWith("https://");
        
        const linkClass = cn(
          "grow flex items-center justify-center w-full h-full text-parchment-700 hover:text-indigo-600 transition-colors duration-200",
          isActive && "text-white hover:text-white"
        );

        return (
          <DockItem key={index} mouseX={mouseX} isActive={isActive}>
            {isExternal ? (
              <a
                href={item.link}
                target={item.target}
                rel="noopener noreferrer"
                className={linkClass}
              >
                {item.Icon}
              </a>
            ) : (
              <Link
                to={item.link}
                target={item.target}
                className={linkClass}
              >
                {item.Icon}
              </Link>
            )}
          </DockItem>
        );
      })}
    </motion.div>
  );
};
 
interface DockItemProps {
  mouseX: MotionValue<number>;
  isActive: boolean;
  children: React.ReactNode;
}
 
export const DockItem = ({ mouseX, isActive, children }: DockItemProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const iconScale = useTransform(width, [40, 80], [1, 1.5]);
  const iconSpring = useSpring(iconScale, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  return (
    <motion.div
      ref={ref}
      style={{ width }}
      className={cn(
        "aspect-square w-10 rounded-full flex items-center justify-center border transition-colors duration-200",
        isActive 
          ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20" 
          : "bg-parchment-100 border-parchment-250 text-parchment-700 hover:bg-parchment-200"
      )}
    >
      <motion.div
        style={{ scale: iconSpring }}
        className="flex items-center justify-center w-full h-full grow"
      >
        {children}
      </motion.div>
    </motion.div>
  );
};
