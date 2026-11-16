import { geoMercator, geoPath, type GeoGeometryObjects, type GeoPermissibleObjects } from "d3-geo";
import { useState } from "react";
import { Link } from "react-router";
import adminFile from "../map/adminData";
import { religionCensus, religionRegionShares, formatReligionShare, numberOfPeople, type ReligionPageEntry } from "../site/religions";

const WIDTH = 420;
const HEIGHT = 470;
const LABELS = 5;
const FONT = 11.5;

type Feature = { type: "Feature"; properties: Record<string, string | number | null>; geometry: GeoGeometryObjects };
const admin = adminFile as unknown as { type: "FeatureCollection"; features: Feature[] };
const projection = geoMercator().fitExtent([[12, 10], [WIDTH - 12, HEIGHT - 10]], admin as unknown as GeoPermissibleObjects);
const path = geoPath(projection).digits(1);
// 종교와 무관한 도형은 한 번만 계산한다.
const shapes = admin.features.map(feature => {
  const [x, y] = path.centroid(feature);
  return { id: String(feature.properties.iso_3166_2), name: String(feature.properties.name_ko), d: path(feature) ?? "", x, y, tiny: path.area(feature) < 70 };
});
const shapeById = new Map(shapes.map(shape => [shape.id, shape]));

type Box = { left: number; top: number; right: number; bottom: number };
const overlaps = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
function textWidth(text: string) {
  return [...text].reduce((sum, char) => sum + (/[가-힣]/.test(char) ? 1 : char === " " ? 0.32 : 0.6), 0) * FONT;
}
/** 이름표가 서로, 그리고 다른 표식과 겹치지 않는 가장 가까운 자리를 고른다. */
function placeLabels(items: { id: string; x: number; y: number; text: string }[]) {
  const placed: Box[] = [];
  const dots = items.map(item => ({ left: item.x - 4, top: item.y - 4, right: item.x + 4, bottom: item.y + 4 }));
  return items.map((item, index) => {
    const width = textWidth(item.text);
    const candidates = [10, 22, 36, 52, 70].flatMap(gap => [
      { x: item.x + gap, y: item.y + FONT * 0.36, anchor: "start" as const },
      { x: item.x - gap, y: item.y + FONT * 0.36, anchor: "end" as const },
      { x: item.x, y: item.y - gap, anchor: "middle" as const },
      { x: item.x, y: item.y + gap + FONT * 0.72, anchor: "middle" as const },
      { x: item.x + gap, y: item.y - gap * 0.7, anchor: "start" as const },
      { x: item.x - gap, y: item.y - gap * 0.7, anchor: "end" as const },
      { x: item.x + gap, y: item.y + gap * 0.7 + FONT * 0.72, anchor: "start" as const },
      { x: item.x - gap, y: item.y + gap * 0.7 + FONT * 0.72, anchor: "end" as const },
    ]);
    const boxOf = (candidate: typeof candidates[number]): Box => {
      const left = candidate.anchor === "start" ? candidate.x : candidate.anchor === "end" ? candidate.x - width : candidate.x - width / 2;
      return { left: left - 2, top: candidate.y - FONT, right: left + width + 2, bottom: candidate.y + FONT * 0.3 };
    };
    const fits = (box: Box) => box.left >= 2 && box.right <= WIDTH - 2 && box.top >= 2 && box.bottom <= HEIGHT - 2
      && !placed.some(other => overlaps(box, other)) && !dots.some((dot, other) => other !== index && overlaps(box, dot));
    const choice = candidates.find(candidate => fits(boxOf(candidate))) ?? candidates[0];
    const box = boxOf(choice);
    placed.push(box);
    // 이름표가 멀어지면 표식에서 이름표의 가까운 변까지 선을 긋는다.
    const edgeX = Math.max(box.left + 2, Math.min(item.x, box.right - 2));
    const edgeY = Math.max(box.top + 2, Math.min(item.y, box.bottom - 2));
    return { ...item, ...choice, leader: Math.hypot(edgeX - item.x, edgeY - item.y) > 14 ? { x: edgeX, y: edgeY } : null };
  });
}

/** 주·연방직할지별 비율을 색의 진하기로 칠한 지도. 전체 수치는 noscript 목록에 글로 둔다. */
export function ReligionMap({ religion }: { religion: ReligionPageEntry }) {
  const regions = religionRegionShares(religion);
  const max = regions[0].share;
  const byPlace = new Map(regions.flatMap(region => region.profile.placeIds.map(id => [id, region] as const)));
  const fill = (share: number) => `color-mix(in srgb, var(--letter) ${Math.round(share / max * 100)}%, #f4f1ea)`;
  const shareOf = (region: typeof regions[number]) => formatReligionShare(region.population, region.profile.population);
  const [hovered, setHovered] = useState<string | null>(null);
  const hover = (id: string) => ({
    onMouseEnter: () => setHovered(id), onFocus: () => setHovered(id),
    onMouseLeave: () => setHovered(null), onBlur: () => setHovered(null),
  });
  const shown = hovered ? shapeById.get(hovered) : undefined;
  const labels = religion.mapLabels === false ? [] : placeLabels(regions.slice(0, LABELS).map(region => {
    const shape = shapeById.get(region.profile.placeIds[0])!;
    return { id: shape.id, x: shape.x, y: shape.y, text: `${shape.name} ${shareOf(region)}` };
  }));
  const scope = `${religionCensus.year}년 인구조사 · 지역 주민 전체 기준 · 당시 행정구역의 수치를 현재 지도에 칠함`;
  return <figure className="religion-map" data-religion={religion.censusGroup}>
    <div className="religion-map-stage">
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`${religion.ko} 인구 비율 지도 · ${scope}`}>
      {shapes.map(shape => {
        const region = byPlace.get(shape.id)!;
        return <Link key={shape.id} to={`/bharat/map?place=${shape.id}`} data-place={shape.id} data-share={shareOf(region)}
          aria-label={`${shape.name} ${shareOf(region)}`} {...hover(shape.id)}>
          <path d={shape.d} style={{ fill: fill(region.share) }} />
        </Link>;
      })}
      {/* 너무 작아 색이 안 보이는 지역은 같은 색의 점으로 한 번 더 표시한다. */}
      {shapes.filter(shape => shape.tiny).map(shape => {
        const region = byPlace.get(shape.id)!;
        return <Link key={shape.id} to={`/bharat/map?place=${shape.id}`} tabIndex={-1} aria-hidden="true" {...hover(shape.id)}>
          <circle className="religion-map-tiny" cx={shape.x} cy={shape.y} r="4.5" style={{ fill: fill(region.share) }} />
        </Link>;
      })}
      {labels.map(label => <g key={label.id} className="religion-map-label" data-label={label.id}>
        {label.leader && <line x1={label.leader.x} y1={label.leader.y} x2={shapeById.get(label.id)!.x} y2={shapeById.get(label.id)!.y} />}
        {/* 작은 지역은 색을 칠한 점이 이미 있으므로 흰 표식으로 덮지 않는다. */}
        {!shapeById.get(label.id)!.tiny && <circle cx={shapeById.get(label.id)!.x} cy={shapeById.get(label.id)!.y} r="2.6" />}
        <text x={label.x} y={label.y} textAnchor={label.anchor} fontSize={FONT}>{label.text}</text>
      </g>)}
    </svg>
    {/* 올려 둔 지역의 이름과 비율. 전체 수치는 아래 noscript 목록에 글로 있다. */}
    {shown && <p className="religion-map-tip" style={{ left: `${shown.x / WIDTH * 100}%`, top: `${shown.y / HEIGHT * 100}%` }}>
      <span>{shown.name}</span><strong>{shareOf(byPlace.get(shown.id)!)}</strong>
    </p>}
    </div>
    <figcaption>
      <span className="religion-map-scale" aria-hidden="true"><span>0%</span><i /><span>{formatReligionShare(regions[0].population, regions[0].profile.population)}</span></span>
      <small>{religionCensus.year}년 인구조사</small>
    </figcaption>
    <noscript>
      <p>{religion.ko} 인구 비율이 높은 순 · {scope}</p>
      <ol id={`religion-regions-${religion.id}`}>{regions.map(region => <li key={region.profile.id} data-region={region.profile.id}>
        {region.profile.area} · {shareOf(region)} · {numberOfPeople(region.population)}{region.profile.note ? ` · ${region.profile.note}` : ""}
      </li>)}</ol>
    </noscript>
  </figure>;
}
