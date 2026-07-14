# Beta media assets

Optional product demo video:

```text
public/assets/beta-demo.mp4
```

**Current product behavior:** `/beta` uses a real product screenshot (`/beta/dpa-preview.png`) with a click-through to `/#upload`. There is no `<video>` element and no request for `beta-demo.mp4`, so a missing file is intentional and not a production bug.

Add the MP4 later only if you want to replace the screenshot with a real demo reel.
