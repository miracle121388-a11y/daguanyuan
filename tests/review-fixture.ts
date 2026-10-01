import {reviewCategories} from '../server/continuation.mjs';
export const approvedReview=()=>({approved:true,checks:reviewCategories.map(category=>({category,status:'pass' as 'pass'|'blocked',evidence:`测试审稿依据：${category}已对照测试前情和正文。`})),issues:[] as string[]});
