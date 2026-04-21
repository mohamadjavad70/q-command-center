export interface ShipPosition {
  x: number;
  y: number;
  z: number;
}

export class ShipController {
  private position: ShipPosition = { x: 0, y: 0, z: 0 };

  move(dx: number, dy: number, dz: number) {
    this.position = {
      x: this.position.x + dx,
      y: this.position.y + dy,
      z: this.position.z + dz,
    };
  }

  warpToPlanet(planetId: string) {
    const offset = planetId.length % 9;
    this.position = {
      x: offset * 10,
      y: offset * 4,
      z: offset * -6,
    };
  }

  getPosition(): ShipPosition {
    return { ...this.position };
  }
}
