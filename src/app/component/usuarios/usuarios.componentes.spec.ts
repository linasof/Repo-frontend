import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UsuariosComponentes } from './usuarios.componentes';

describe('UsuariosComponentes', () => {
  let component: UsuariosComponentes;
  let fixture: ComponentFixture<UsuariosComponentes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UsuariosComponentes],
    }).compileComponents();

    fixture = TestBed.createComponent(UsuariosComponentes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
