import type { CSSProperties, ReactNode } from "react";

type TaskSectionProps = {
  task: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export default function TaskSection({ task, children, className, style }: TaskSectionProps) {
  const combinedClassName = className ? `task-section ${className}` : "task-section";

  return (
    <section className={combinedClassName} data-task={task} style={style}>
      {children}
    </section>
  );
}
