const updateSkills = () => {
  for (let i = 0; i < skills.length; i++) {
    const skill = skills[i];

    if (skill.type === 'push') {
      skill.outerRadius += 5;
      skill.innerRadius += 2.5;
      skill.opacity += -0.02;
      skill.life += -1;
    } else if (skill.type === 'bomb') {
      skill.outerRadius += -5;
      skill.innerRadius += -2.5;
      skill.opacity += 0.03;
      skill.life += -1;
    }
  }

  skills = skills.filter(skill => skill.life > 0);
};

const drawSkills = () => {
  for (let i = 0; i < skills.length; i++) {
    const skill = skills[i];
    const x = skill.pos.x;
    const y = skill.pos.y;

    const grad = ctx.createRadialGradient(x, y, 0, x, y, skill.outerRadius);
    grad.addColorStop(0, `rgba(${skill.color.r}, ${skill.color.g}, ${skill.color.b}, ${skill.opacity})`);
    grad.addColorStop(1, `rgba(${skill.color.r}, ${skill.color.g}, ${skill.color.b}, 0)`);

    ctx.save();
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, skill.outerRadius, 0, Math.PI * 2, false); // outer
    ctx.arc(x, y, skill.innerRadius, 0, Math.PI * 2, true); // inner
    ctx.fill();
    ctx.closePath();
    ctx.restore();
  }
};

// show something when skill is used
const handleSkill = (data) => {
  const skill = {
    type: data.type,
    pos: data.pos,
    color: {
      r: Math.round(data.color.r * 0.75),
      g: Math.round(data.color.g * 0.75),
      b: Math.round(data.color.b * 0.75),
    },
    outerRadius: 0,
    innerRadius: 0,
    opacity: 0,
    life: 30,
  };

  if (skill.type === 'push') {
    skill.opacity = 0.6;
    skills.push(skill);
  } else if (skill.type === 'bomb') {
    skill.outerRadius = 150;
    skill.innerRadius = 75;
    skills.push(skill);
  }
};