# Mobile player position and minimization

Preview only. After tapping a music result on narrow screens (<=850px) player is ordered above search results, page scrolls to top. A Zmensit/Rozbalit floating control collapses player into persistent bottom audio control while preserving the existing YouTube IFrame instance. Desktop CSS unchanged. QR routes unchanged. Must validate actual playback persistence, orientation, tap targets, iPhone safe areas, and iframe media restrictions before production. Rollback preview to 1379f1752498b302a7128deb28bb729ec8007426 if needed.
