function a(){return t=>{let e=t.get("fromDate")?.value,r=t.get("toDate")?.value;return e&&r&&Date.parse(e)>Date.parse(r)?{dateRange:!0}:null}}export{a};
