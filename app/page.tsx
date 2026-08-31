"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const catalog = [
  { slug: "kimi-no-kokoro", title: "君のこころは輝いてるかい？", artist: "Aqours", cover: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/%E5%90%9B%E3%81%AE%E3%81%93%E3%81%93%E3%82%8D%E3%81%AF%20%E8%BC%9D%E3%81%84%E3%81%A6%E3%82%8B%E3%81%8B%E3%81%84%EF%BC%9F3000x3000bb.jpg" },
  { slug: "yume-mirai", title: "ユメ+ミライ=無限大", artist: "Aqours", cover: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/%E3%83%A6%E3%83%A1%2B%E3%83%9F%E3%83%A9%E3%82%A4%3D%20%E7%84%A1%E9%99%90%E5%A4%A73000x3000bb.jpg" },
  { slug: "happy-party-train", title: "HAPPY PARTY TRAIN", artist: "Aqours", cover: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/HAPPY%20PARTY%20TRAIN3000x3000bb.jpg" },
  { slug: "over-next-rainbow", title: "Over The Next Rainbow", artist: "Saint Aqours Snow", cover: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/Over%20The%20Next%20Rainbow3000x3000bb.jpg" },
  { slug: "eternal-hours", title: "永久hours", artist: "Aqours", cover: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/%E6%B0%B8%E4%B9%85hours3000x3000bb.jpg" },
  { slug: "aozora-jumping-heart", title: "青空Jumping Heart", artist: "Aqours", cover: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/%E9%9D%92%E7%A9%BAJumping%20Heart3000x3000bb.jpg" },
  { slug: "mirai-ticket", title: "MIRAI TICKET", artist: "Aqours", cover: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/MIRAI%20TICKET3000x3000bb.jpg" },
  { slug: "yume-kataru-yori-yume-utaou", title: "ユメ語るよりユメ歌おう", artist: "Aqours", cover: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/%E3%83%A6%E3%83%A1%E8%AA%9E%E3%82%8B%E3%82%88%E3%82%8A%E3%83%A6%E3%83%A1%E6%AD%8C%E3%81%8A%E3%81%863000x3000bb.jpg" },
  { slug: "miracle-wave", title: "MIRACLE WAVE", artist: "Aqours", cover: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/MIRACLE%20WAVE3000x3000bb.jpg" },
  { slug: "my-mai-tonight", title: "MY舞☆TONIGHT", artist: "Aqours", cover: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/MIRACLE%20WAVE3000x3000bb.jpg" },
  { slug: "sora-mo-kokoro-mo-hareru-kara", title: "空も心も晴れるから", artist: "Aqours", cover: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/%E7%A9%BA%E3%82%82%E5%BF%83%E3%82%82%E6%99%B4%E3%82%8C%E3%82%8B%E3%81%8B%E3%82%893000x3000bb.jpg" },
  { slug: "water-blue-new-world", title: "WATER BLUE NEW WORLD", artist: "Aqours", cover: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/WATER%20BLUE%20NEW%20WORLD3000x3000bb.jpg" },
];

export default function Home() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const syncTheme = () => {
      const saved = localStorage.getItem("yomikana-theme");
      const nextTheme = saved === "light" || saved === "dark" ? saved : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      setTheme(nextTheme);
    };
    syncTheme();
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    localStorage.setItem("yomikana-theme", nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    setTheme(nextTheme);
  };

  return (
    <main className="library-page">
      <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "切换到浅色模式" : "切换到暗色模式"} aria-pressed={theme === "dark"}>
        <Moon className="theme-icon theme-icon-moon" aria-hidden="true" />
        <Sun className="theme-icon theme-icon-sun" aria-hidden="true" />
      </button>

      <section className="library-shell" aria-labelledby="library-title">
        <header className="library-heading">
          <h1 id="library-title">聴いて、読んで、<br /><em>歌をひらく。</em></h1>
          <p>在旋律里学习日语。</p>
        </header>

        <div className="song-grid" aria-label="歌曲列表">
          {catalog.map((song) => (
            <a className="song-card" href={`/songs/${song.slug}`} key={song.slug}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="song-card-cover" src={song.cover} width="1400" height="1400" alt="" />
              <div className="song-card-copy">
                <h2>{song.title}</h2>
                <span className="song-card-artist">{song.artist}</span>
              </div>
            </a>
          ))}
        </div>

      </section>
    </main>
  );
}
