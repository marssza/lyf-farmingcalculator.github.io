document.getElementById('generate').addEventListener('click', () => {
  const fields = parseInt(document.getElementById('fields').value);
  const wantHighYield = document.getElementById('high').checked;
  const wantMutatedYield = document.getElementById('mutated').checked;

  const settings = { fields, wantHighYield, wantMutatedYield };

  if (fields < 2 || fields > 20) {
    alert("Field count must be between 6 and 20.");
    return;
  }

  const result = generateRotation(settings);

  const output = document.getElementById('output');
  const error = document.getElementById('error');
  const checklist = document.getElementById('checklist');

  if (result.tooManyCycles) {
    output.innerHTML = '';
    checklist.innerHTML = '';
    error.style.display = 'block';
  } else {
    error.style.display = 'none';
    output.innerHTML = result.html;
    checklist.innerHTML = result.checklistHtml;
  }
});

function generateRotation(settings) {
  const crops = [
    { name: 'Caroot', type: 'Potassic' },
    { name: 'Polyberry', type: 'Potassic' },
    { name: 'Honeybottle', type: 'Potassic' },
    { name: 'Lumloom', type: 'Phosphoric' },
    { name: 'Rabbage', type: 'Phosphoric' },
    { name: 'Zappertwig', type: 'Nitrogenic' },
    { name: 'Chromize', type: 'Nitrogenic' },
    { name: 'Wheat', type: 'Nitrogenic' }
  ];

  const soilRotations = {
    'Nitrogenic': { high: 'Phosphoric', mutated: 'Potassic' },
    'Phosphoric': { high: 'Potassic', mutated: 'Nitrogenic' },
    'Potassic': { high: 'Nitrogenic', mutated: 'Phosphoric' }
  };

  const max = 10;
  let count = 0;

  const fields = [];
  for (let i = 0; i < settings.fields; i++) {
    fields.push({
      currentSoil: 'Nitrogenic',
      history: []
    });
  }

  const goals = {};
  crops.forEach(crop => {
    goals[crop.name] = {
      highYieldTarget: false,
      mutatedYieldTarget: false
    };
  });

  while (count < max) {
    count++;

    let usedCropsThisCycle = {};

    fields.forEach(field => {
      let soil = field.currentSoil;

      let wantPhosphoric = false;
      let wantNitrogenic = false;
      let wantPotassic = false;

      crops.forEach(crop => {
        if (settings.wantHighYield && !goals[crop.name].highYieldTarget) {
          if (soilRotations[crop.type].high === 'Phosphoric') wantPhosphoric = true;
          if (soilRotations[crop.type].high === 'Nitrogenic') wantNitrogenic = true;
          if (soilRotations[crop.type].high === 'Potassic') wantPotassic = true;
        }
        if (settings.wantMutatedYield && !goals[crop.name].mutatedYieldTarget) {
          if (soilRotations[crop.type].mutated === 'Phosphoric') wantPhosphoric = true;
          if (soilRotations[crop.type].mutated === 'Nitrogenic') wantNitrogenic = true;
          if (soilRotations[crop.type].mutated === 'Potassic') wantPotassic = true;
        }
      });

      const cropScores = crops.map(crop => {
        let score = 0;

        const alreadyDone = (
          (settings.wantHighYield ? goals[crop.name].highYieldTarget : true) &&
          (settings.wantMutatedYield ? goals[crop.name].mutatedYieldTarget : true)
        );

        if (alreadyDone) {
          score = 0;
        } else {
          if (settings.wantHighYield && !goals[crop.name].highYieldTarget) {
            if (soil === soilRotations[crop.type].high) score += 10;
            else score += 5;
          }
          if (settings.wantMutatedYield && !goals[crop.name].mutatedYieldTarget) {
            if (soil === soilRotations[crop.type].mutated) score += 10;
            else score += 5;
          }
          if (count >= 8) {
            if (settings.wantHighYield && !goals[crop.name].highYieldTarget) score += 5;
            if (settings.wantMutatedYield && !goals[crop.name].mutatedYieldTarget) score += 5;
          }
        }

        let steeringBonus = (count >= 8) ? 10 : 3;
        const nextSoil = crop.type;

        if (wantPhosphoric && nextSoil === 'Phosphoric') score += steeringBonus;
        if (wantNitrogenic && nextSoil === 'Nitrogenic') score += steeringBonus;
        if (wantPotassic && nextSoil === 'Potassic') score += steeringBonus;

        if (usedCropsThisCycle[crop.name]) score -= 5;

        return { crop, score };
      });

      cropScores.sort((a, b) => b.score - a.score);

      let lastCrop = field.history.length > 0 ? field.history[field.history.length - 1].crop : null;
      let chosen = cropScores.find(c => c.crop.name !== lastCrop && c.score >= 0);

      if (!chosen) {
        chosen = cropScores[0];
      }

      const crop = chosen.crop;

      field.history.push({
        crop: crop.name,
        soilBefore: field.currentSoil,
        soilAfter: crop.type
      });

      field.currentSoil = crop.type;
      usedCropsThisCycle[crop.name] = true;

      if (settings.wantHighYield &&
          field.history[field.history.length - 1].soilBefore === soilRotations[crop.type].high) {
        goals[crop.name].highYieldTarget = true;
      }
      if (settings.wantMutatedYield &&
          field.history[field.history.length - 1].soilBefore === soilRotations[crop.type].mutated) {
        goals[crop.name].mutatedYieldTarget = true;
      }
    });

    let checking = crops.every(crop => {
      let goal = goals[crop.name];
      let ok = true;
      if (settings.wantHighYield) ok = ok && goal.highYieldTarget;
      if (settings.wantMutatedYield) ok = ok && goal.mutatedYieldTarget;
      return ok;
    });

    if (checking) {
      return {
        tooManyCycles: false,
        html: buildHtml(fields, count, crops, soilRotations, settings),
        checklistHtml: buildChecklist(goals)
      };
    }
  }

  return { tooManyCycles: true };
}

function buildHtml(fields, count, crops, soilRotations, settings) {
  let html = '<table>';
  html += '<tr><th>Field #</th>';
  for (let cycle = 1; cycle <= count; cycle++) {
    html += `<th>Cycle ${cycle} - Crop</th><th>Soil After</th>`;
  }
  html += '</tr>';

  fields.forEach((field, index) => {
    html += `<tr><td>Field ${index + 1}</td>`;
    field.history.forEach(cycle => {
      const cropObj = crops.find(c => c.name === cycle.crop);
      let cssClass = 'normal';
      let icon = '';

      if (settings.wantHighYield && cycle.soilBefore === soilRotations[cropObj.type].high) {
        cssClass = 'high';
        icon = ' ⭐';
      } else if (settings.wantMutatedYield && cycle.soilBefore === soilRotations[cropObj.type].mutated) {
        cssClass = 'mutated';
        icon = ' ✨';
      }

      html += `<td class="${cssClass}">${cycle.crop}${icon}</td><td>${cycle.soilAfter}</td>`;
    });
    html += '</tr>';
  });

  html += '</table>';
  return html;
}

function buildChecklist(goals) {
  let html = '<ul>';
  for (const cropName in goals) {
    const g = goals[cropName];
    html += `<li>✅ <b>${cropName}</b> — High: ${g.highYieldTarget ? '⭐' : '❌'} — Mutated: ${g.mutatedYieldTarget ? '✨' : '❌'}</li>`;
  }
  html += '</ul>';
  return html;
}