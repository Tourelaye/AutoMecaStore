import { Component, OnInit } from '@angular/core';
import { CommandeService } from '../../../core/services/commande.service';
import { Commande } from '../../../models/commande.model';

@Component({
  selector: 'app-commandes',
  templateUrl: './commandes.component.html'
})
export class CommandesComponent implements OnInit {

  commandes: Commande[] = [];

  constructor(private commandeService: CommandeService) {}

  ngOnInit(): void {
    this.commandeService.getCommandes().subscribe(data => {
      this.commandes = data;
      console.log(this.commandes);
    });
  }
}