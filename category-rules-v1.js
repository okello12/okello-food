(() => {
  'use strict';

  // These are reference thresholds, not Okello traffic-light thresholds.
  // GB nutrition-claim rules define source/high protein by share of energy and
  // source/high fibre by g per 100 kcal. The protein density equivalents below
  // use 4 kcal per gram of protein: 12% => 3 g/100 kcal, 20% => 5 g/100 kcal.
  const CLAIM_REFERENCES=Object.freeze({
    proteinPer100Kcal:Object.freeze({source:3,high:5}),
    fibrePer100Kcal:Object.freeze({source:1.5,high:3})
  });

  const RULES=Object.freeze([
    Object.freeze({
      id:'yoghurt',
      label:'Yoghurt',
      exactTags:Object.freeze(['en:yogurts']),
      required:Object.freeze(['proteinPer100Kcal','sugar100']),
      metrics:Object.freeze([
        Object.freeze({key:'proteinPer100Kcal',label:'Protein density',kind:'protein-reference'}),
        Object.freeze({key:'sugar100',label:'Sugars',kind:'quantity',unit:'g / 100 g'})
      ]),
      caveat:'Sugars are shown as a packet quantity only. Okello does not apply a custom traffic-light cutoff.'
    }),
    Object.freeze({
      id:'bread',
      label:'Bread',
      exactTags:Object.freeze(['en:breads']),
      required:Object.freeze(['fibrePer100Kcal','salt100','kcal100']),
      metrics:Object.freeze([
        Object.freeze({key:'fibrePer100Kcal',label:'Fibre density',kind:'fibre-reference'}),
        Object.freeze({key:'salt100',label:'Salt',kind:'quantity',unit:'g / 100 g'}),
        Object.freeze({key:'kcal100',label:'Energy',kind:'quantity',unit:'kcal / 100 g'})
      ]),
      caveat:'Salt is shown as a packet quantity only until the exact UK front-of-pack traffic-light component is implemented.'
    }),
    Object.freeze({
      id:'peanut-butter',
      label:'Peanut butter',
      exactTags:Object.freeze(['en:peanut-butters']),
      required:Object.freeze(['proteinPer100Kcal','fat100','saturatedFat100']),
      metrics:Object.freeze([
        Object.freeze({key:'proteinPer100Kcal',label:'Protein density',kind:'protein-reference'}),
        Object.freeze({label:'Saturated fat share',kind:'percent-of',numerator:'saturatedFat100',denominator:'fat100'})
      ]),
      caveat:'This is energy-dense food. Portion size is useful context, not a penalty against the product.'
    }),
    Object.freeze({
      id:'olive-oil',
      label:'Olive oil',
      exactTags:Object.freeze(['en:olive-oils']),
      required:Object.freeze(['fat100','saturatedFat100']),
      metrics:Object.freeze([
        Object.freeze({label:'Saturated fat share',kind:'percent-of',numerator:'saturatedFat100',denominator:'fat100'})
      ]),
      caveat:'Oil is not judged on protein density. Amount used is the main portion-control question.'
    })
  ]);

  function finite(value){
    return value!==null && value!=='' && Number.isFinite(Number(value));
  }

  function sourceTags(product){
    const tags=product?.sourceCategories?.tags;
    if(!Array.isArray(tags))return [];
    return tags.map(v=>String(v||'').trim().toLowerCase()).filter(Boolean);
  }

  function match(product){
    const set=new Set(sourceTags(product));
    for(const rule of RULES){
      for(const tag of rule.exactTags){
        if(set.has(tag))return Object.freeze({rule,evidenceTag:tag});
      }
    }
    return null;
  }

  function quantityObservation(metric,product){
    const value=product[metric.key];
    if(!finite(value))return null;
    return Object.freeze({
      metric:metric.key,
      label:metric.label,
      value:Number(value),
      unit:metric.unit,
      text:`${metric.label}: ${Number(value).toFixed(1).replace(/\.0$/,'')} ${metric.unit}.`
    });
  }

  function proteinObservation(metric,product){
    const value=product[metric.key];
    if(!finite(value))return null;
    const v=Number(value), ref=CLAIM_REFERENCES.proteinPer100Kcal;
    let band='below-source', text='Protein density is below the GB source-of-protein claim reference.';
    if(v>=ref.high){band='high';text='Protein density meets the GB high-protein claim reference (at least 20% of energy from protein).';}
    else if(v>=ref.source){band='source';text='Protein density meets the GB source-of-protein claim reference (at least 12% of energy from protein).';}
    return Object.freeze({metric:metric.key,label:metric.label,value:v,unit:'g / 100 kcal',band,text});
  }

  function fibreObservation(metric,product){
    const value=product[metric.key];
    if(!finite(value))return null;
    const v=Number(value), ref=CLAIM_REFERENCES.fibrePer100Kcal;
    let band='below-source', text='Fibre density is below the GB source-of-fibre claim reference.';
    if(v>=ref.high){band='high';text='Fibre density meets the GB high-fibre claim reference (at least 3 g per 100 kcal).';}
    else if(v>=ref.source){band='source';text='Fibre density meets the GB source-of-fibre claim reference (at least 1.5 g per 100 kcal).';}
    return Object.freeze({metric:metric.key,label:metric.label,value:v,unit:'g / 100 kcal',band,text});
  }

  function percentObservation(metric,product){
    const numerator=product[metric.numerator], denominator=product[metric.denominator];
    if(!finite(numerator)||!finite(denominator)||Number(denominator)<=0)return null;
    const value=Number(numerator)/Number(denominator)*100;
    return Object.freeze({
      metric:`${metric.numerator}/${metric.denominator}`,
      label:metric.label,
      value,
      unit:'% of fat',
      text:`${metric.label}: ${value.toFixed(1).replace(/\.0$/,'')}% of the fat.`
    });
  }

  function evaluateMetric(metric,product){
    if(metric.kind==='quantity')return quantityObservation(metric,product);
    if(metric.kind==='protein-reference')return proteinObservation(metric,product);
    if(metric.kind==='fibre-reference')return fibreObservation(metric,product);
    if(metric.kind==='percent-of')return percentObservation(metric,product);
    return null;
  }

  function assess(product){
    const matched=match(product);
    if(!matched){
      return Object.freeze({
        state:'unsupported',
        ruleId:null,
        categoryLabel:null,
        evidenceTag:null,
        missing:Object.freeze([]),
        observations:Object.freeze([]),
        message:'Category unknown or unsupported. Showing factual nutrient density only; no neighbouring category rule has been borrowed.'
      });
    }

    const {rule,evidenceTag}=matched;
    const missing=rule.required.filter(key=>!finite(product?.[key]));
    if(missing.length){
      return Object.freeze({
        state:'incomplete',
        ruleId:rule.id,
        categoryLabel:rule.label,
        evidenceTag,
        missing:Object.freeze([...missing]),
        observations:Object.freeze([]),
        message:`${rule.label} category recognised, but required product data is incomplete. Generic nutrient facts remain usable.`
      });
    }

    const observations=rule.metrics.map(metric=>evaluateMetric(metric,product));
    if(observations.some(x=>x===null)){
      return Object.freeze({
        state:'incomplete',
        ruleId:rule.id,
        categoryLabel:rule.label,
        evidenceTag,
        missing:Object.freeze(['derived metric']),
        observations:Object.freeze([]),
        message:`${rule.label} category recognised, but a required derived metric could not be calculated. Generic nutrient facts remain usable.`
      });
    }

    return Object.freeze({
      state:'supported',
      ruleId:rule.id,
      categoryLabel:rule.label,
      evidenceTag,
      missing:Object.freeze([]),
      observations:Object.freeze(observations),
      caveat:rule.caveat,
      message:`${rule.label} matched by an exact source category tag.`
    });
  }

  window.OkelloCategoryRules=Object.freeze({
    version:1,
    rules:RULES,
    claimReferences:CLAIM_REFERENCES,
    match,
    assess
  });
})();
