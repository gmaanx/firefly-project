import { ImageCompressionLab } from '../compression/ImageCompressionLab';
import { FooterSection } from '../components/sections/FooterSection';
import { LiveSandboxSection } from '../components/sections/LiveSandboxSection';

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
      {/* Lab 1: Live Mathematical Optimization Sandbox (#101110) */}
      <LiveSandboxSection
        reducedMotion={reducedMotion}
        onRegisterSpaceToggle={onRegisterSpaceToggle}
      />

      {/* Lab 2: FA RGB Image Compression Lab (#101110 + #161815 cards) */}
      <ImageCompressionLab reducedMotion={reducedMotion} />

      <FooterSection reducedMotion={reducedMotion} />
    </>
  );
}
