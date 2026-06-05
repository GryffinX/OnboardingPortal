from django.db import migrations, models


PREINSTALLED_SOFTWARE = [
    "Windows 11 Enterprise",
    "Microsoft 365",
    "SentinelOne",
    "Cisco AnyConnect VPN",
    "Google Chrome",
    "Zoom Workplace",
]

EMPLOYEE_SOFTWARE = [
    "Slack",
    "Git",
    "Visual Studio Code",
    "Postman",
]



def seed_software_catalog(apps, schema_editor):
    SoftwareCatalogItem = apps.get_model("onboarding", "SoftwareCatalogItem")

    for index, name in enumerate(PREINSTALLED_SOFTWARE):
        SoftwareCatalogItem.objects.get_or_create(
            name=name,
            category="preinstalled",
            defaults={"sort_order": index},
        )

    for index, name in enumerate(EMPLOYEE_SOFTWARE):
        SoftwareCatalogItem.objects.get_or_create(
            name=name,
            category="employee",
            defaults={"sort_order": index},
        )


class Migration(migrations.Migration):

    dependencies = [
        ("onboarding", "0007_onboardingrequest"),
    ]

    operations = [
        migrations.CreateModel(
            name="SoftwareCatalogItem",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=150)),
                (
                    "category",
                    models.CharField(
                        choices=[("preinstalled", "Pre-installed"), ("employee", "Employee-installed")],
                        db_index=True,
                        max_length=20,
                    ),
                ),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("sort_order", models.PositiveIntegerField(default=0)),
            ],
            options={
                "ordering": ["sort_order", "name"],
            },
        ),
        migrations.AddConstraint(
            model_name="softwarecatalogitem",
            constraint=models.UniqueConstraint(
                fields=("name", "category"),
                name="unique_software_catalog_item_per_category",
            ),
        ),
        migrations.RunPython(seed_software_catalog, migrations.RunPython.noop),
    ]
