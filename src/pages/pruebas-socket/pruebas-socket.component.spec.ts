import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PruebasSocketComponent } from './pruebas-socket.component';

describe('PruebasSocketComponent', () => {
  let component: PruebasSocketComponent;
  let fixture: ComponentFixture<PruebasSocketComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PruebasSocketComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PruebasSocketComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
