import type { ReactNode, Ref, SVGProps } from 'react'
import { COURT, courtHeight } from '../lib/engine'
import type { Play, Point, Scene } from '../lib/types'

export const MARGIN = 7

function HalfCourt() {
  return (
    <g>
      <rect className="court-key" x={50.5} y={0} width={49} height={58} />
      <g className="court-lines">
        <path d="M50.5 0V58H99.5V0" />
        {/* cercle des lancers francs */}
        <path d="M57 58A18 18 0 0 0 93 58" />
        <path d="M57 58A18 18 0 0 1 93 58" strokeDasharray="3.5 3.5" />
        {/* ligne à 3 points */}
        <path d="M9 0V29.9A67.5 67.5 0 0 0 141 29.9V0" />
        {/* zone de non-charge, planche et cercle */}
        <path d="M62.5 12V15.75A12.5 12.5 0 0 0 87.5 15.75V12" />
        <path d="M66 12H84" strokeWidth={1.6} />
        <circle cx={COURT.basket.x} cy={COURT.basket.y} r={2.8} className="court-rim" />
        <path d="M57 140A18 18 0 0 1 93 140" />
      </g>
    </g>
  )
}

/** Position du doigt en coordonnées du terrain, limitée à ses abords. */
export function courtPoint(svg: SVGSVGElement, e: { clientX: number; clientY: number }, court: Scene['court']): Point {
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM()!.inverse())
  const clamp = (v: number, max: number) => Math.round(Math.max(-4, Math.min(max + 4, v)) * 10) / 10
  return { x: clamp(p.x, COURT.width), y: clamp(p.y, courtHeight(court)) }
}

interface Props extends SVGProps<SVGSVGElement> {
  court: Play['court']
  svgRef?: Ref<SVGSVGElement>
  children?: ReactNode
}

export function Court({ court, svgRef, children, className = '', ...rest }: Props) {
  const height = courtHeight(court)
  return (
    <svg
      ref={svgRef}
      className={`court court-${court} ${className}`}
      viewBox={`${-MARGIN} ${-MARGIN} ${COURT.width + MARGIN * 2} ${height + MARGIN * 2}`}
      {...rest}
    >
      <rect className="court-floor" x={-MARGIN} y={-MARGIN} width={COURT.width + MARGIN * 2} height={height + MARGIN * 2} />
      <HalfCourt />
      {court === 'full' && (
        <g transform={`translate(0 ${COURT.full}) scale(1 -1)`}>
          <HalfCourt />
        </g>
      )}
      <rect className="court-lines" x={0} y={0} width={COURT.width} height={height} />
      {children}
    </svg>
  )
}
