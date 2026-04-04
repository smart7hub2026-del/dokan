import type { PremiumAuthScene } from './authSceneAssets';
import { SCENE_IMAGES } from './authSceneAssets';

export default function AuthPremiumBackground({ scene = 'login' }: { scene?: PremiumAuthScene }) {
  const img = SCENE_IMAGES[scene] ?? SCENE_IMAGES.login;
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden>
      <div className="absolute inset-0 auth-premium-base" />
      <div className="absolute inset-0 auth-premium-aurora" />
      <div className="absolute inset-0 auth-premium-mesh" />
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.2] mix-blend-soft-light auth-premium-kenburns will-change-transform"
        style={{ backgroundImage: `url(${img})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-transparent to-slate-950/85" />
      <div className="absolute inset-0 auth-premium-grain" />
      <div className="absolute -top-[20%] -right-[15%] h-[min(70vw,520px)] w-[min(70vw,520px)] rounded-full bg-indigo-500/20 blur-[100px] auth-premium-orb-a" />
      <div className="absolute -bottom-[25%] -left-[10%] h-[min(60vw,440px)] w-[min(60vw,440px)] rounded-full bg-cyan-500/15 blur-[90px] auth-premium-orb-b" />
      <div className="absolute top-1/2 left-1/2 h-[min(100vw,800px)] w-[min(100vw,800px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/10 blur-[140px] auth-premium-orb-c" />
    </div>
  );
}
