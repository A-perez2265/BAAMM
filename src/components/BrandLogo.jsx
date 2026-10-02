import skillSwapLogo from '../assets/skillswap-logo-sans.png'

// Frame the artwork rather than its transparent canvas padding.
export default function BrandLogo({ variant = 'auth', decorative = false }) {
  return (
    <span className={`brand-logo brand-logo--${variant}`}>
      <span className="brand-symbol" aria-hidden="true"><img src={skillSwapLogo} alt="" /></span>
      <span className="brand-wordmark" aria-hidden={decorative || undefined}>SKILL SWAP<span>LEARN • SHARE • GROW</span></span>
    </span>
  )
}
