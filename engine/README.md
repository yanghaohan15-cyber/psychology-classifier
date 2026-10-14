# engine/

渲染引擎，取自 [HeyChengC/vibe-knowledge-film](https://github.com/HeyChengC/vibe-knowledge-film) 的 `engine/`，MIT 许可（见同目录 `LICENSE`）。

本仓库里的改动：

- `render.py`：可以用环境变量 `VK_CHROME` 指定一个 Chrome / Chromium 可执行文件（默认仍用本机 Google Chrome）。
- `audio.py`：为《毒药谜题》加了几种合成音效（玻璃、纸、打字、笔、到账提示音、扫描、钟摆等）。

字体是 SIL Open Font License，不放进仓库：

```bash
python engine/get_fonts.py
```
