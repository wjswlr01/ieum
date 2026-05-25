type Props = {
  userName: string;
  todayLabel: string;
  todayMeasurementCount: number;
  todayPlannedTaskCount: number;
};

function subtitle(measurements: number, tasks: number): string {
  if (measurements === 0 && tasks === 0) return "오늘은 평온한 하루입니다";
  if (measurements > 0 && tasks > 0) {
    return `오늘 측정 ${measurements}건 · 덧술 ${tasks}건 예정`;
  }
  if (measurements > 0) return `오늘 측정 ${measurements}건`;
  return `오늘 덧술 ${tasks}건 예정`;
}

export default function HomeGreeting({
  userName,
  todayLabel,
  todayMeasurementCount,
  todayPlannedTaskCount,
}: Props) {
  return (
    <section className="flex flex-col gap-1">
      <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-brew-text">
        안녕하세요, {userName}님
      </h1>
      <p className="text-sm md:text-base text-brew-muted">
        {todayLabel} / {subtitle(todayMeasurementCount, todayPlannedTaskCount)}
      </p>
    </section>
  );
}
