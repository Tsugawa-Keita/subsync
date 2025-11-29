import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import YouTube, { type YouTubeEvent, type YouTubePlayer } from "react-youtube";
import jaSubtitles from "@/assets/ja-8iAQ1h30n5l.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function App() {
  return <YoutubeEmbedded />;
}

const YoutubeEmbedded = () => {
  const [inputValue, setInputValue] = useState("https://www.youtube.com/watch?v=8iAQ1h30n5I");
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const submitHandler = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("送信；", inputValue);
    setYoutubeVideoId(extractYoutubeVideoId(inputValue));
    setInputValue("");
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const youtubePlayerRef = useRef<YouTubePlayer | null>(null);
  const onReady = (e: YouTubeEvent) => {
    youtubePlayerRef.current = e.target;
  };
  const onStatusChange = (e: YouTubeEvent<number>) => {
    if (e.data === 1) {
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    const ypRef = youtubePlayerRef.current;
    if (!ypRef || !isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTime(ypRef.getCurrentTime());
    }, 200);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const calcCurrentSubtitle = (currentTime: number | null) => {
    if (currentTime === null) {
      return 0;
    }
    const currentSubtitle = jaSubtitles.segments.find(
      (element) => element.startSec <= currentTime && currentTime < element.endSec,
    );
    return currentSubtitle?.text;
  };
  const currentSubtitle = calcCurrentSubtitle(currentTime);

  return (
    <div>
      <div>youtube embedding</div>
      <form onSubmit={submitHandler}>
        <Input
          type="text"
          value={inputValue}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setInputValue(e.currentTarget.value)}
        />
        <Button type="submit">送信</Button>
      </form>
      {youtubeVideoId ? (
        <div>
          <p>{youtubeVideoId}</p>
          <YouTube videoId={youtubeVideoId} onReady={onReady} onStateChange={onStatusChange} />
        </div>
      ) : (
        <p>videoidを入力してください。</p>
      )}
      <div>
        <p>再生中かどうか</p>
        <p> {isPlaying ? "true" : "false"}</p>
        <p>動画時間</p>
        <p> {currentTime}</p>
        <p>日本語字幕</p>
        <p> {currentSubtitle}</p>
      </div>
    </div>
  );
};

/**
 * YouTube の URL から動画 ID を抽出します。
 * 対応形式: 通常 URL / 短縮 URL / 埋め込み URL。
 * https://www.youtube.com/watch?v=VIDEO_ID　標準形式のURL
 * https://youtu.be/VIDEO_ID　短縮URL
 * https://www.youtube.com/embed/VIDEO_ID　埋め込みプレーヤーのURL
 *
 * @param rawUrl 動画 ID を取得したい YouTube の URL 文字列。
 * @returns 見つかった動画 ID。取得できない場合は null。
 */
const extractYoutubeVideoId = (rawUrl: string): string | null => {
  // 1. try文でurlをパースする
  try {
    const url = new URL(rawUrl);
    // 2. hostname, pathname, searchParams を取り出す
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname;
    const searchParams = url.searchParams;
    // 3. urlをもとに pattern を決める
    //   - 標準形式；'standard'
    //   - 短縮形式；'short'
    //   - 埋め込み形式；'embed'
    //   - それ以外；'unknown'
    type urlPattern = "standard" | "short" | "embed" | "unknown";
    let pattern: urlPattern = "unknown";
    if (hostname === "www.youtube.com" && pathname === "/watch" && searchParams.has("v")) {
      pattern = "standard";
    } else if (hostname === "youtu.be") {
      pattern = "short";
    } else if (hostname === "www.youtube.com" && pathname.startsWith("/embed/")) {
      pattern = "embed";
    } else {
      pattern = "unknown";
    }
    // 4. switch文で形式ごとの処理でVIDEOIDを取り出す
    //   - standard; クエリ(v)からvideoidを取得
    //   - short; pathnameからvideoidを取得
    //   - embed; pathnameからvideoidを取得
    //   - unknown; nullを返す
    switch (pattern) {
      case "standard":
        return searchParams.get("v");
      case "short":
        return pathname.slice(1);
      case "embed": {
        const videoIdIndex = pathname.indexOf("/embed/") + "/embed/".length;
        return pathname.slice(videoIdIndex);
      }
      case "unknown":
        return null;
    }
  } catch {
    return null;
  }
};
