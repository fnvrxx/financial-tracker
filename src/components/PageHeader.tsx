"use client";

interface Props {
  title: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
}

export default function PageHeader({ title, children, icon }: Props) {
  return (
    <div className="gradient-purple rounded-b-[32px] px-5 md:px-8 pt-12 pb-6 text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold font-display">{title}</h1>
          {icon}
        </div>
        {children}
      </div>
    </div>
  );
}
