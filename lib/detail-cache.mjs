export const detailCache=new Map();
export function cachedDetail(id){const item=detailCache.get(id);return item&&Date.now()-item.at<600000?item.patch:null;}
