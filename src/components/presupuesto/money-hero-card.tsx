import { formatMoney } from "@/lib/ritmistas-utils";

interface BalanceHeroProps {
  type: "balance";
  label: string;
  value: number;
}

interface ProgressHeroProps {
  type: "progress";
  label: string;
  spent: number;
  budget: number;
}

type MoneyHeroCardProps = BalanceHeroProps | ProgressHeroProps;

export function MoneyHeroCard(props: MoneyHeroCardProps) {
  return (
    <div className="rounded-2xl bg-bg-inverse p-5.5">
      <div className="mb-2.5 text-[11px] font-semibold tracking-[0.05em] text-[#B8B8B8] uppercase">{props.label}</div>
      {props.type === "balance" ? (
        <div className={`font-mono-num text-[36px] font-bold ${props.value < 0 ? "text-danger" : "text-white"}`}>
          {formatMoney(props.value)}
        </div>
      ) : (
        <ProgressHero spent={props.spent} budget={props.budget} />
      )}
    </div>
  );
}

function ProgressHero({ spent, budget }: { spent: number; budget: number }) {
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const remaining = budget - spent;
  return (
    <div>
      <div className="font-mono-num text-[36px] font-bold text-white">{formatMoney(spent)}</div>
      <div className="mt-1 text-[13px] text-[#B8B8B8]">de {formatMoney(budget)} presupuestado</div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
        <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
      </div>
      <div className={`font-mono-num mt-2 text-[12px] font-semibold ${remaining >= 0 ? "text-[#4ADE80]" : "text-[#F87171]"}`}>
        {formatMoney(Math.abs(remaining))} {remaining >= 0 ? "disponible" : "excedido"}
      </div>
    </div>
  );
}
