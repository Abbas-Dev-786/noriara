import Phaser from 'phaser';

class PlaceholderScene extends Phaser.Scene {
  constructor() {
    super('PlaceholderScene');
  }

  create() {
    this.add.text(this.cameras.main.centerX, this.cameras.main.centerY - 50, 'Daily Line (Phaser Canvas)', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    // Draw a bouncing ball to prove it's rendering and animating
    const circle = this.add.circle(this.cameras.main.centerX, this.cameras.main.centerY + 50, 30, 0xd93900);
    
    this.tweens.add({
      targets: circle,
      y: this.cameras.main.centerY + 100,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }
}

export function createGame(parent: HTMLElement): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 600,
    height: 400,
    parent: parent,
    backgroundColor: '#111827', // slate-900 / gray-900
    scene: [PlaceholderScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };

  return new Phaser.Game(config);
}
