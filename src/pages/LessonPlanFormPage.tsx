import { Link } from "react-router";
import { lessonPlanForm as form } from "../site/lessonPlanForm";

/** 책장에 세워 둔 A4 한 장. 기울여도 선이 깨지지 않게 벡터로 양식의 뼈대만 그린다. */
export function LessonPlanSheetArt() {
  const left = 20, right = 190, top = 54, thin = 9, head = 12, bottom = 277;
  const stageTop = top + thin * 4 + head;
  const stageHeight = (bottom - stageTop) / form.stages.length;
  const columns = [50, 120, 160, 174];
  return <svg className="sheet-art" viewBox="0 0 210 297" aria-hidden="true">
    <text x={left} y="38">{form.title}</text>
    <rect className="sheet-shade" x={left} y={top} width={columns[0] - left} height={bottom - top} />
    <rect className="sheet-shade is-head" x={left} y={top + thin * 4} width={right - left} height={head} />
    <rect className="sheet-line" x={left} y={top} width={right - left} height={bottom - top} />
    {[1, 2, 3, 4].map(row => <line className="sheet-line" key={row} x1={left} x2={right} y1={top + thin * row} y2={top + thin * row} />)}
    <line className="sheet-line" x1={left} x2={right} y1={stageTop} y2={stageTop} />
    {form.stages.slice(1).map((stage, index) => <line className="sheet-line" key={stage} x1={left} x2={right}
      y1={stageTop + stageHeight * (index + 1)} y2={stageTop + stageHeight * (index + 1)} />)}
    <line className="sheet-line" x1={columns[0]} x2={columns[0]} y1={top} y2={bottom} />
    {columns.slice(1).map(x => <line className="sheet-line" key={x} x1={x} x2={x} y1={top + thin * 4} y2={bottom} />)}
  </svg>;
}

export function LessonPlanFormPage() {
  const [unit, time, number] = form.header;
  return <article className="plan-form-page">
    <p className="eyebrow"><Link to="/lessons">교안</Link></p>
    <div className="plan-sheet">
      <h1>{form.title} <small>({form.context})</small></h1>
      <div className="plan-table-scroll">
        <table className="plan-table">
          <colgroup><col className="plan-col-stage" /><col className="plan-col-who" /><col /><col /><col /><col /><col className="plan-col-time" /><col className="plan-col-note" /></colgroup>
          <tbody>
            <tr>
              <th scope="row">{unit.label}</th><td colSpan={2}>{unit.value}</td>
              <th scope="row">{time.label}</th><td>{time.value}</td>
              <th scope="row">{number.label}</th><td colSpan={2}>{number.value}</td>
            </tr>
            {form.rows.map(label => <tr key={label}><th scope="row">{label}</th><td colSpan={7} /></tr>)}
            {form.materials.who.map((who, index) => <tr key={who}>
              {index === 0 && <th scope="row" rowSpan={form.materials.who.length}>{form.materials.label}</th>}
              <th scope="row" className="plan-sub">{who}</th><td colSpan={6} />
            </tr>)}
            <tr className="plan-head">
              <th scope="col">{form.columns[0]}</th><th scope="col" colSpan={3}>{form.columns[1]}</th>
              <th scope="col" colSpan={2}>{form.columns[2]}</th><th scope="col">{form.columns[3]}</th><th scope="col">{form.columns[4]}</th>
            </tr>
            {form.stages.map(stage => <tr className="plan-stage" key={stage}>
              <th scope="row">{stage}</th><td colSpan={3} /><td colSpan={2} /><td /><td />
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
    <noscript><p>출처: {form.source}</p></noscript>
  </article>;
}
