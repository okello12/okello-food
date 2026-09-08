(() => {
  'use strict';

  const VERSION=1;
  const repo=window.OkelloStateRepository;
  if(!repo)return;

  function migrateState(state){
    let changed=false;
    let migrated=0;
    let promoted=0;
    let conflicts=0;

    for(const entries of Object.values(state?.logs||{})){
      for(const entry of Array.isArray(entries)?entries:[]){
        if(!entry||typeof entry!=='object'||entry.countUnit==null)continue;
        const legacy=String(entry.countUnit||'').trim();
        const canonical=String(entry.pieceKey||'').trim();

        if(legacy&&!canonical){
          entry.pieceKey=legacy;
          promoted++;
        }else if(legacy&&canonical&&legacy!==canonical){
          // v45 wrote both from the same definition, so divergence is not an
          // expected valid state. Keep pieceKey as canonical and preserve the
          // conflicting legacy value only as migration evidence.
          entry.legacyCountUnitConflict=legacy;
          conflicts++;
        }

        delete entry.countUnit;
        migrated++;
        changed=true;
      }
    }
    return {state,changed,migrated,promoted,conflicts};
  }

  const before=repo.read();
  const result=migrateState(before);
  let writeResult={ok:true,revision:repo.revision?.()||0};
  if(result.changed){
    writeResult=repo.replace(result.state,{source:'count-unit-migration-v46'});
  }

  const report=Object.freeze({
    version:VERSION,
    changed:result.changed,
    migrated:result.migrated,
    promoted:result.promoted,
    conflicts:result.conflicts,
    writeOk:!!writeResult?.ok
  });

  if(result.changed&&!writeResult?.ok){
    console.error('v46 count-unit migration could not persist',writeResult);
  }

  window.OkelloCountUnitMigrationV46=Object.freeze({
    version:VERSION,
    migrateState,
    result:report
  });
})();
