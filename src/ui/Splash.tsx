import { tap } from '../platform/native';
import { Ref } from './parts';

/** 初めて開いたときの扉(見本1)。冬の窓辺・毛糸のかご・眠る猫 */
export function Splash({ onStart }: { onStart: () => void }) {
  return (
    <div className="splash">
      <Ref name="splash" className="splash-bg" />
      <div className="splash-title">
        <h1 className="splash-logo">てくあみ</h1>
        <p className="splash-sub">歩いて編む歩数計</p>
      </div>
      <div className="splash-foot">
        <p className="splash-lead">
          歩くたび、
          <br />
          やさしい編みものが増えていく。
        </p>
        <button
          className="btn btn-primary"
          onClick={() => {
            tap();
            onStart();
          }}
        >
          はじめる
        </button>
      </div>
    </div>
  );
}
