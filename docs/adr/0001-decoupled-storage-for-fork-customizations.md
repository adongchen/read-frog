# Decoupled Storage for Fork Customizations

Read Frog has a centralized, strict configuration migration system (`v001` through `v101+`) that frequently increments on upstream releases. To avoid perpetual merge conflicts in config schemas and migration scripts when synchronizing `upstream/main` into the `custom` branch, fork-specific user preferences (such as the subtitle `OptimizerMode` switch) must be stored in isolated extension storage keys rather than mutating upstream's `videoSubtitles` schema.
