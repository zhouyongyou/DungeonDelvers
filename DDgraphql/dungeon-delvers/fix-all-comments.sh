#!/bin/bash

echo "修復所有註釋語法錯誤..."

# 修復 altar-of-ascension-v23.ts
sed -i '' '30,35s/^[[:space:]]*\([^/]\)/    \/\/ \1/g' src/altar-of-ascension-v23.ts

# 修復 dungeon-master.ts
sed -i '' '76,80s/^[[:space:]]*\([^/]\)/  \/\/ \1/g' src/dungeon-master.ts
sed -i '' '122,126s/^[[:space:]]*\([^/]\)/    \/\/ \1/g' src/dungeon-master.ts
sed -i '' '232,236s/^[[:space:]]*\([^/]\)/    \/\/ \1/g' src/dungeon-master.ts

# 修復 party.ts
sed -i '' '199,203s/^[[:space:]]*\([^/]\)/    \/\/ \1/g' src/party.ts

# 修復 player-profile-v23.ts
sed -i '' '38,41s/^[[:space:]]*\([^/]\)/    \/\/ \1/g' src/player-profile-v23.ts
sed -i '' '55,59s/^[[:space:]]*\([^/]\)/    \/\/ \1/g' src/player-profile-v23.ts
sed -i '' '73,77s/^[[:space:]]*\([^/]\)/    \/\/ \1/g' src/player-profile-v23.ts

# 修復 player-profile.ts
sed -i '' '46,51s/^[[:space:]]*\([^/]\)/    \/\/ \1/g' src/player-profile.ts
sed -i '' '66,70s/^[[:space:]]*\([^/]\)/    \/\/ \1/g' src/player-profile.ts

# 修復 vip-staking-v23.ts
sed -i '' '58,61s/^[[:space:]]*\([^/]\)/    \/\/ \1/g' src/vip-staking-v23.ts
sed -i '' '76,79s/^[[:space:]]*\([^/]\)/    \/\/ \1/g' src/vip-staking-v23.ts
sed -i '' '98,101s/^[[:space:]]*\([^/]\)/    \/\/ \1/g' src/vip-staking-v23.ts
sed -i '' '132,136s/^[[:space:]]*\([^/]\)/    \/\/ \1/g' src/vip-staking-v23.ts

# 修復 vip-staking.ts
sed -i '' '94,97s/^[[:space:]]*\([^/]\)/        \/\/ \1/g' src/vip-staking.ts

echo "✓ 修復完成！"