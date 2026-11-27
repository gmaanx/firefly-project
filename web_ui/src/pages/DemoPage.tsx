import { ImageCompressionLab } from '../compression/ImageCompressionLab';
import { FooterSection } from '../components/sections/FooterSection';
import { LiveSandboxSection } from '../components/sections/LiveSandboxSection';
import { LandoSectionBlend } from '../components/shared/LandoSectionBlend';

export interface DemoPageProps {
  reducedMotion: boolean;
  onRegisterSpaceToggle: (fn: (() => void) | null) => void;
}

export function DemoPage({
  reducedMotion,
  onRegisterSpaceToggle,
}: DemoPageProps) {
  return (
    <>
      {/* Lab 1: Live Mathematical Optimization Sandbox (#1C2017 Deep Racing Olive) */}
      <LiveSandboxSection
        reducedMotion={reducedMotion}
        onRegisterSpaceToggle={onRegisterSpaceToggle}
      />

      <LandoSectionBlend
        from="olive-dark"
        to="obsidian"
        reducedMotion={reducedMotion}
      />

      {/* Lab 2: FA RGB Image Compression Lab (#101110 + #161815 cards) */}
      <ImageCompressionLab reducedMotion={reducedMotion} />

      <FooterSection reducedMotion={reducedMotion} />
    </>
  );
}
