import { Link } from "react-router";
import { lessonPlanForm as form } from "../site/lessonPlanForm";

/** 책장에 세워 둔 A4 한 장. 양식의 뼈대만 작게 그린다. */
export function LessonPlanSheetArt() {
  return <span className="sheet-art" aria-hidden="true">
    <b>{form.title}</b>
    <i className="sheet-top" />
    <i className="sheet-top" />
    <i className="sheet-top" />
    <i className="sheet-head" />
    {form.stages.map(stage => <i className="sheet-stage" key={stage} />)}
  </span>;
}

export function LessonPlanFormPage() {
  const [unit, time, number] = form.header;
  return <article className="plan-form-page">
    <p className="eyebrow"><Link to="/lessons">교안</Link></p>
    <div className="plan-sheet">
      <h1>{form.title}</h1>
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
