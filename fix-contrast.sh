#!/bin/bash
# ClauseCheck WCAG 对比度修复 — 一键执行
# 用法: cd ~/Desktop/clausecheck && bash fix-contrast.sh

FILE="app/globals.css"
PAGE="app/page.tsx"

echo "🔧 修复 globals.css ..."

# 1. btn-primary 默认态
sed -i '' 's/linear-gradient(135deg, #e07b5a, #cc6a4a)/linear-gradient(135deg, #b8482a, #a8321c)/g' "$FILE"
sed -i '' 's/rgba(224, 123, 90, 0.25)/rgba(184, 72, 42, 0.25)/g' "$FILE"

# 2. btn-primary hover
sed -i '' 's/linear-gradient(135deg, #cc6a4a, #b85a3d)/linear-gradient(135deg, #a8321c, #90281a)/g' "$FILE"
sed -i '' 's/rgba(224, 123, 90, 0.40)/rgba(184, 72, 42, 0.40)/g' "$FILE"

# 3. step-num
sed -i '' 's/color: rgba(224, 123, 90, 0.20)/color: #C07060/g' "$FILE"

# 4. faq-q:hover
sed -i '' 's/.faq-q:hover { color: #e07b5a; }/.faq-q:hover { color: #b84a25; }/g' "$FILE"

# 5. dim-val.fairness
sed -i '' 's/.dim-val.fairness  { color: #F97316; }/.dim-val.fairness  { color: #C2410C; }/g' "$FILE"

# 6-8. flag-level-badge
sed -i '' 's/.flag-level-badge.high {\n  background: #FEF2F2;\n  color: #DC2626;/.flag-level-badge.high {\n  background: #FEF2F2;\n  color: #B91C1C;/g' "$FILE"
sed -i '' 's/.flag-level-badge.medium {\n  background: #FFFBEB;\n  color: #D97706;/.flag-level-badge.medium {\n  background: #FFFBEB;\n  color: #92400E;/g' "$FILE"
sed -i '' 's/.flag-level-badge.low {\n  background: #F0FDF4;\n  color: #16A34A;/.flag-level-badge.low {\n  background: #F0FDF4;\n  color: #166534;/g' "$FILE"

# 9-11. time-badge
sed -i '' 's/.time-badge.high {\n  background: #FEF2F2;\n  color: #DC2626;/.time-badge.high {\n  background: #FEF2F2;\n  color: #B91C1C;/g' "$FILE"
sed -i '' 's/.time-badge.medium {\n  background: #FFFBEB;\n  color: #D97706;/.time-badge.medium {\n  background: #FFFBEB;\n  color: #92400E;/g' "$FILE"
sed -i '' 's/.time-badge.low {\n  background: #F0FDF4;\n  color: #16A34A;/.time-badge.low {\n  background: #F0FDF4;\n  color: #166534;/g' "$FILE"

# 12-14. upload-submit-btn
sed -i '' 's/rgba(224,123,90,.25)/rgba(184,72,42,.25)/g' "$FILE"
sed -i '' 's/rgba(224,123,90,.3)/rgba(184,72,42,.3)/g' "$FILE"
sed -i '' 's/rgba(224,123,90,.4)/rgba(184,72,42,.4)/g' "$FILE"

# 15. currency-btn.active
sed -i '' 's/rgba(224,123,90,0.35)/rgba(184,72,42,0.35)/g' "$FILE"

# 16. nego-priority
sed -i '' 's/rgba(224,123,90,0.35)/rgba(184,72,42,0.35)/g' "$FILE"
sed -i '' 's/rgba(224, 123, 90, 0.35)/rgba(184, 72, 42, 0.35)/g' "$FILE"

# 17. pricing-card featured 中的 rgba
sed -i '' 's/rgba(224, 123, 90, 0.04)/rgba(184, 72, 42, 0.04)/g' "$FILE"
sed -i '' 's/rgba(224, 123, 90, 0.15)/rgba(184, 72, 42, 0.15)/g' "$FILE"

# 18. upload-cloud-icon, upload-dialog hover 等残留 #e07b5a (只改非装饰性的)
# 这些是装饰性元素，不动

echo "🔧 修复 page.tsx (推荐徽章) ..."
sed -i '' 's/text-accent-dark/text-[#8B3A0E]/g' "$PAGE"

echo "✅ 全部修复完成！"
echo ""
echo "接下来执行："
echo "  git add -A"
echo "  git commit -m 'fix: WCAG 对比度全面修复'"
echo "  git push origin main"
