import { Mark } from "./Mark";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Mark size={56} />
          <p className="footer-name">senpai-split</p>
        </div>
        <div className="footer-how">
          <h2 className="footer-title">計算のしかた</h2>
          <p>
            人のいる区分を、上座（上司）から下座（新人）へ並べ、払う重みをまっすぐ下げます。いちばん上の区分は、いちばん下の区分の「倍率」ぶんを払います。
            会計をこの重みで分けてから、区分ごとに決めた単位で切り上げます。端数を上の区分が持つときは、下の区分を切り捨て、足りない分をいちばん上の区分が持ちます。
          </p>
          <p className="footer-note">入れた金額や名前は、この端末の外へ送りません。内訳のURLには、会計・人数・倍率・端数の決まり・飲まない人と割引率・区分の名前と、会と幹事の名前だけが入ります。</p>
        </div>
      </div>
    </footer>
  );
}
